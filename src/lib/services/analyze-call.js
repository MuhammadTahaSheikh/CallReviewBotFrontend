import { prisma } from "../prisma";
import { analyzeCallSchema } from "../validation";
import { precheckSensitiveContent } from "../ai/sensitive-precheck";
import { runCallAnalysis } from "../ai/provider";
import { assertWeightsSumTo100, computeWeightedScore } from "../scoring-profiles";
import { runPolicyEngine } from "../policy/engine";
import { getPolicySettings } from "./policy-settings";
import { applyPolicyActions } from "./actions";
import { createExceptionReview } from "./exceptions";

async function ensureBusinessAndRep({ businessName, representativeName }) {
  let business = null;
  let representative = null;

  const bizName = (businessName || "").trim() || "Northstar Clinic";
  business = await prisma.business.findFirst({ where: { name: bizName } });
  if (!business) {
    business = await prisma.business.create({ data: { name: bizName } });
  }

  const repName = (representativeName || "").trim();
  if (repName) {
    representative = await prisma.representative.findFirst({
      where: { name: repName, businessId: business.id },
    });
    if (!representative) {
      representative = await prisma.representative.create({
        data: { name: repName, businessId: business.id },
      });
    }
  }

  return { business, representative };
}

/**
 * Manual transcript intake → demo/live analysis → persisted report.
 * @param {object} rawInput
 * @param {{ ownerUserId?: string|null }} [options]
 */
export async function analyzeAndStoreCall(rawInput, options = {}) {
  const input = analyzeCallSchema.parse(rawInput);
  const started = Date.now();
  const ownerUserId = options.ownerUserId || null;

  const profile = await prisma.scoringProfile.findUnique({ where: { callType: input.callType } });
  if (!profile) {
    throw new Error(`Scoring profile not found for call type: ${input.callType}`);
  }

  const categories = JSON.parse(profile.categories);
  assertWeightsSumTo100(categories);

  const sensitive = precheckSensitiveContent(input.transcript);
  const { business, representative } = await ensureBusinessAndRep({
    businessName: input.businessName,
    representativeName: input.representativeName,
  });

  const source = input.source || "manual";
  const call = await prisma.call.create({
    data: {
      title: input.title,
      callType: input.callType,
      status: sensitive.blocked ? "quarantined" : "processing",
      riskLevel: sensitive.blocked ? "high" : "low",
      source,
      externalMeetingId: input.externalMeetingId || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      businessId: business.id,
      representativeId: representative?.id || null,
      representativeName: representative?.name || input.representativeName || null,
      ownerUserId,
      scoringProfileId: profile.id,
      transcript: {
        create: {
          content: input.transcript,
          charCount: input.transcript.length,
        },
      },
      auditLogs: {
        create: {
          actor: source === "manual" ? "demo-reviewer" : "webhook",
          event: "call.created",
          detail: JSON.stringify({
            source,
            externalMeetingId: input.externalMeetingId || null,
            callType: input.callType,
          }),
        },
      },
    },
  });

  if (sensitive.blocked) {
    await createExceptionReview({
      callId: call.id,
      reason: `Sensitive content pre-screen blocked model transmission: ${sensitive.reasons.join(", ")}`,
    });
    await prisma.auditLog.create({
      data: {
        callId: call.id,
        actor: "system",
        event: "call.quarantined",
        detail: JSON.stringify({ reasons: sensitive.reasons, policy: "pre_screen" }),
      },
    });

    return {
      callId: call.id,
      status: "quarantined",
      riskLevel: "high",
      routing: "exception",
      message: "Transcript flagged by sensitive-data pre-screen. Quarantined for human review; not sent to the model.",
    };
  }

  try {
    const { analysis, meta } = await runCallAnalysis({
      transcript: input.transcript,
      callType: input.callType,
      title: input.title,
    });

    // Align weights/labels with stored profile
    const byKey = new Map(categories.map((c) => [c.key, c]));
    const normalizedScores = analysis.categoryScores.map((score) => {
      const def = byKey.get(score.key);
      return {
        ...score,
        label: def?.label || score.label,
        weight: def?.weight ?? score.weight,
      };
    });

    const overallScore = computeWeightedScore(normalizedScores);
    const policy = await getPolicySettings();
    const policyDecision = runPolicyEngine({
      callId: call.id,
      transcript: input.transcript,
      analysisRisks: analysis.risks || [],
      proposedActions: analysis.proposedActions || [],
      policy,
    });

    const riskLevel = policyDecision.riskLevel;
    const status = policyDecision.routing.callStatus;

    await prisma.callAnalysis.create({
      data: {
        callId: call.id,
        summary: analysis.summary,
        purpose: analysis.purpose || null,
        strengths: JSON.stringify(analysis.strengths),
        weaknesses: JSON.stringify(analysis.weaknesses),
        recommendations: JSON.stringify(analysis.recommendations),
        followUpOpportunities: JSON.stringify(analysis.followUpOpportunities || []),
        risks: JSON.stringify([
          ...(analysis.risks || []),
          ...policyDecision.riskReasons.filter((r) => !(analysis.risks || []).includes(r)),
        ]),
        missingInformation: JSON.stringify(analysis.missingInformation || []),
        proposedActions: JSON.stringify(analysis.proposedActions || []),
        rawModelOutput: JSON.stringify({ analysis, policyDecision }),
        demoMode: Boolean(meta.demoMode),
        model: meta.model || null,
        latencyMs: meta.latencyMs ?? Date.now() - started,
        inputTokens: meta.inputTokens ?? null,
        outputTokens: meta.outputTokens ?? null,
        categoryScores: {
          create: normalizedScores.map((cat) => ({
            key: cat.key,
            label: cat.label,
            weight: cat.weight,
            score: cat.score,
            justification: cat.justification || null,
            evidenceQuote: cat.evidenceQuote || null,
            evidenceVerified: Boolean(cat.evidenceVerified),
          })),
        },
        recommendationRows: {
          create: [
            ...analysis.recommendations.map((text) => ({ text, kind: "coaching" })),
            ...(analysis.followUpOpportunities || []).map((text) => ({ text, kind: "follow_up" })),
            ...(analysis.risks || []).map((text) => ({ text, kind: "risk" })),
            ...(analysis.missingInformation || []).map((text) => ({ text, kind: "missing_info" })),
          ],
        },
      },
    });

    const actionResults = await applyPolicyActions({
      callId: call.id,
      actionDecisions: policyDecision.actions,
    });

    if (policyDecision.routing.requireHumanReview) {
      const reason =
        policyDecision.routing.reasons[0] ||
        policyDecision.riskReasons[0] ||
        "Routed to human review by policy engine";
      await createExceptionReview({ callId: call.id, reason });
    }

    await prisma.call.update({
      where: { id: call.id },
      data: {
        status,
        riskLevel,
        overallScore,
        processedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        callId: call.id,
        actor: "system",
        event: "call.analyzed",
        detail: JSON.stringify({
          demoMode: meta.demoMode,
          model: meta.model,
          overallScore,
          status,
          riskLevel,
          routing: policyDecision.routing.route,
          routingReasons: policyDecision.routing.reasons,
          actionResults,
          policySnapshot: policyDecision.policySnapshot,
        }),
      },
    });

    return {
      callId: call.id,
      status,
      riskLevel,
      overallScore,
      demoMode: Boolean(meta.demoMode),
      model: meta.model,
      latencyMs: meta.latencyMs ?? Date.now() - started,
      routing: policyDecision.routing.route,
      routingReasons: policyDecision.routing.reasons,
    };
  } catch (error) {
    await prisma.call.update({
      where: { id: call.id },
      data: { status: "failed" },
    });
    await prisma.auditLog.create({
      data: {
        callId: call.id,
        actor: "system",
        event: "call.analysis_failed",
        detail: JSON.stringify({ message: error.message }),
      },
    });
    throw error;
  }
}

export async function getCallById(id, { appUser } = {}) {
  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      transcript: true,
      business: true,
      representative: true,
      scoringProfile: true,
      analysis: {
        include: {
          categoryScores: true,
          recommendationRows: true,
        },
      },
      actionTasks: { orderBy: { createdAt: "asc" } },
      automations: { orderBy: { createdAt: "asc" } },
      exceptionReviews: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!call) return null;
  if (appUser && appUser.role !== "admin" && call.ownerUserId !== appUser.id) {
    return null;
  }
  return call;
}

export async function listCalls(filters = {}) {
  const where = {};
  if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
  if (filters.callType && filters.callType !== "all") where.callType = filters.callType;
  if (filters.risk && filters.risk !== "all") where.riskLevel = filters.risk;
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.source && filters.source !== "all") {
    if (filters.source === "manual") {
      where.source = "manual";
    } else if (filters.source === "webhook") {
      where.source = { not: "manual" };
    } else {
      where.source = filters.source;
    }
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { representativeName: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return prisma.call.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: filters.limit ? Number(filters.limit) : 100,
    include: {
      analysis: { select: { demoMode: true, model: true } },
    },
  });
}

export async function getOverviewStats({ ownerUserId } = {}) {
  const scope = ownerUserId ? { ownerUserId } : {};

  const calls = await prisma.call.findMany({
    where: { status: { in: ["completed", "exception"] }, ...scope },
    select: {
      overallScore: true,
      riskLevel: true,
      callType: true,
      status: true,
      occurredAt: true,
      processedAt: true,
      createdAt: true,
      analysis: { select: { latencyMs: true } },
    },
  });

  const totalCalls = await prisma.call.count({ where: scope });
  const flaggedCount = await prisma.call.count({
    where: { ...scope, OR: [{ status: "exception" }, { riskLevel: "high" }] },
  });
  const taskCount = ownerUserId
    ? await prisma.actionTask.count({ where: { call: { ownerUserId } } })
    : await prisma.actionTask.count();
  const failed = await prisma.call.count({ where: { ...scope, status: "failed" } });
  const successRate = totalCalls === 0 ? 0 : ((totalCalls - failed) / totalCalls) * 100;

  const scored = calls.filter((c) => c.overallScore != null);
  const averageScore =
    scored.length === 0 ? 0 : scored.reduce((acc, c) => acc + c.overallScore, 0) / scored.length;

  const latencies = calls.map((c) => c.analysis?.latencyMs).filter((n) => typeof n === "number");
  const avgProcessingMs =
    latencies.length === 0 ? 0 : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  const byTypeMap = new Map();
  for (const call of scored) {
    const entry = byTypeMap.get(call.callType) || { sum: 0, count: 0 };
    entry.sum += call.overallScore;
    entry.count += 1;
    byTypeMap.set(call.callType, entry);
  }

  const typeLabels = {
    sales: "Sales",
    support: "Support",
    booking: "Booking",
    consultation: "Consultation",
    internal: "Internal",
  };

  const scoresByType = [...byTypeMap.entries()].map(([type, { sum, count }]) => ({
    type: typeLabels[type] || type,
    score: Math.round((sum / count) * 10) / 10,
  }));

  const distribution = [
    { bucket: "0–49", count: scored.filter((c) => c.overallScore < 50).length },
    { bucket: "50–69", count: scored.filter((c) => c.overallScore >= 50 && c.overallScore < 70).length },
    { bucket: "70–84", count: scored.filter((c) => c.overallScore >= 70 && c.overallScore < 85).length },
    { bucket: "85–100", count: scored.filter((c) => c.overallScore >= 85).length },
  ];

  // Last 7 days trend
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendMap = new Map();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    trendMap.set(d.toISOString().slice(0, 10), { day: days[d.getDay()], sum: 0, count: 0 });
  }
  for (const call of scored) {
    const key = new Date(call.occurredAt).toISOString().slice(0, 10);
    if (!trendMap.has(key)) continue;
    const entry = trendMap.get(key);
    entry.sum += call.overallScore;
    entry.count += 1;
  }
  const scoreTrend = [...trendMap.values()].map((entry) => ({
    day: entry.day,
    score: entry.count ? Math.round((entry.sum / entry.count) * 10) / 10 : null,
  }));

  const recentCalls = await prisma.call.findMany({
    where: scope,
    orderBy: { occurredAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      callType: true,
      representativeName: true,
      overallScore: true,
      riskLevel: true,
      status: true,
      source: true,
      occurredAt: true,
    },
  });

  return {
    stats: {
      totalCalls,
      averageScore: Math.round(averageScore * 10) / 10,
      flaggedCount,
      taskCount,
      successRate: Math.round(successRate * 10) / 10,
      avgProcessingMs,
    },
    scoreTrend,
    scoresByType,
    distribution,
    recentCalls,
  };
}
