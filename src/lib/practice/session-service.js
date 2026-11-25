import { prisma } from "../prisma";
import { getScenarioById, getPublicScenario, listScenarios } from "./scenarios";
import { getConversationProvider } from "./conversation/provider";
import { evaluatePracticeTranscript, messagesToTranscript } from "./evaluate-practice";

const ACTIVE = new Set(["in_progress"]);
const ENDABLE = new Set(["in_progress"]);

function parseState(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function listPracticeScenarios(filters) {
  return listScenarios(filters).map(getPublicScenario);
}

export async function createPracticeSession({
  scenarioId,
  difficulty = "intermediate",
  representativeName = "",
  ownerUserId = null,
}) {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    const err = new Error("Scenario not found");
    err.statusCode = 404;
    throw err;
  }

  const allowed = ["beginner", "intermediate", "advanced"];
  if (!allowed.includes(difficulty)) {
    const err = new Error("Invalid difficulty");
    err.statusCode = 400;
    throw err;
  }

  const provider = getConversationProvider();
  let opening;
  try {
    opening = await provider.generateOpening({ scenario, difficulty });
  } catch (error) {
    const err = new Error(error.message || "Failed to start live customer simulation with xAI");
    err.statusCode = 502;
    throw err;
  }

  const session = await prisma.practiceSession.create({
    data: {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      callType: scenario.callType,
      difficulty,
      representativeName: representativeName?.trim() || "Practice Representative",
      participantName: scenario.participantName,
      ownerUserId,
      status: "in_progress",
      evaluationStatus: "not_started",
      startedAt: new Date(),
      conversationState: JSON.stringify(
        opening.conversationState || { usedLines: [], coveredIntents: [], turnsSinceConcern: 0, provider: "xai" }
      ),
    },
  });

  await prisma.practiceMessage.create({
    data: {
      sessionId: session.id,
      role: "system",
      content: "Live xAI simulation — the participant is powered by Grok and replies in character as the customer.",
      inputMethod: "text",
      sequence: 0,
    },
  });

  await prisma.practiceMessage.create({
    data: {
      sessionId: session.id,
      role: "participant",
      content: opening.content,
      inputMethod: "text",
      sequence: 1,
    },
  });

  return getPracticeSession(session.id);
}

export async function getPracticeSession(id, { appUser } = {}) {
  const session = await prisma.practiceSession.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { sequence: "asc" } },
      evaluation: true,
    },
  });
  if (!session) return null;
  if (appUser && appUser.role !== "admin" && session.ownerUserId && session.ownerUserId !== appUser.id) {
    return null;
  }
  if (appUser && appUser.role !== "admin" && !session.ownerUserId) {
    // Legacy unowned sessions: only admin
    return null;
  }

  const scenario = getScenarioById(session.scenarioId);
  return {
    ...session,
    conversationState: parseState(session.conversationState),
    scenario: getPublicScenario(scenario),
    evaluation: session.evaluation
      ? {
          ...session.evaluation,
          categoryScores: JSON.parse(session.evaluation.categoryScores || "[]"),
          strengths: JSON.parse(session.evaluation.strengths || "[]"),
          weaknesses: JSON.parse(session.evaluation.weaknesses || "[]"),
          recommendations: JSON.parse(session.evaluation.recommendations || "[]"),
          suggestedResponses: JSON.parse(session.evaluation.suggestedResponses || "[]"),
          missedOpportunities: JSON.parse(session.evaluation.missedOpportunities || "[]"),
          objectiveAssessment: JSON.parse(session.evaluation.objectiveAssessment || "{}"),
          coachingRecommendations: JSON.parse(session.evaluation.coachingRecommendations || "[]"),
          trainingWarnings: JSON.parse(session.evaluation.trainingWarnings || "[]"),
        }
      : null,
  };
}

export async function addPracticeMessage(sessionId, { content, inputMethod = "text", clientMessageId } = {}) {
  const text = String(content || "").trim();
  if (text.length < 1 || text.length > 4000) {
    const err = new Error("Message must be 1–4000 characters");
    err.statusCode = 400;
    throw err;
  }

  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { sequence: "asc" } } },
  });
  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }
  if (!ACTIVE.has(session.status)) {
    const err = new Error(`Session is ${session.status} and cannot accept messages`);
    err.statusCode = 409;
    throw err;
  }

  const state = parseState(session.conversationState);
  if (clientMessageId && state.lastClientMessageId === clientMessageId) {
    return getPracticeSession(sessionId);
  }

  const lastSeq = session.messages.reduce((max, m) => Math.max(max, m.sequence), 0);
  const repSeq = lastSeq + 1;

  const scenario = getScenarioById(session.scenarioId);
  if (!scenario) {
    const err = new Error("Scenario missing for this session");
    err.statusCode = 500;
    throw err;
  }

  const provider = getConversationProvider();
  const history = [
    ...session.messages.filter((m) => m.role !== "system"),
    { role: "representative", content: text },
  ].map((m) => ({ role: m.role, content: m.content }));

  let reply;
  try {
    reply = await provider.generateReply({
      scenario,
      difficulty: session.difficulty,
      history,
      latestRepresentativeMessage: text,
      conversationState: state,
    });
  } catch (error) {
    const err = new Error(error.message || "Live customer reply failed (xAI)");
    err.statusCode = 502;
    throw err;
  }

  await prisma.practiceMessage.create({
    data: {
      sessionId,
      role: "representative",
      content: text,
      inputMethod: inputMethod === "voice" ? "voice" : "text",
      sequence: repSeq,
    },
  });

  await prisma.practiceMessage.create({
    data: {
      sessionId,
      role: "participant",
      content: reply.content,
      inputMethod: "text",
      sequence: repSeq + 1,
    },
  });

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      conversationState: JSON.stringify({
        ...reply.conversationState,
        lastClientMessageId: clientMessageId || null,
      }),
    },
  });

  return getPracticeSession(sessionId);
}

export async function endPracticeSession(sessionId, { abandoned = false } = {}) {
  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: { messages: true },
  });
  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }
  if (!ENDABLE.has(session.status) && session.status !== "evaluation_pending") {
    if (["completed", "evaluated", "evaluation_failed", "abandoned"].includes(session.status)) {
      return getPracticeSession(sessionId);
    }
    const err = new Error(`Cannot end session in status ${session.status}`);
    err.statusCode = 409;
    throw err;
  }

  const endedAt = new Date();
  const startedAt = session.startedAt || session.createdAt;
  const durationSec = Math.max(1, Math.round((endedAt - startedAt) / 1000));

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      status: abandoned ? "abandoned" : "evaluation_pending",
      evaluationStatus: abandoned ? "not_started" : "pending",
      endedAt,
      durationSec,
    },
  });

  return getPracticeSession(sessionId);
}

export async function evaluatePracticeSession(sessionId) {
  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { sequence: "asc" } } },
  });
  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }

  if (!["evaluation_pending", "completed", "evaluated", "evaluation_failed", "abandoned"].includes(session.status)) {
    if (session.status === "in_progress") {
      await endPracticeSession(sessionId);
    }
  }

  const fresh = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { sequence: "asc" } } },
  });

  const scenario = getScenarioById(fresh.scenarioId);
  const dialogue = fresh.messages.filter((m) => m.role === "representative" || m.role === "participant");
  const transcript = messagesToTranscript(dialogue);

  if (dialogue.filter((m) => m.role === "representative").length < 1) {
    const err = new Error("Add at least one representative message before evaluation");
    err.statusCode = 400;
    throw err;
  }

  try {
    const result = await evaluatePracticeTranscript({
      callType: fresh.callType,
      title: fresh.scenarioName,
      transcript,
      scenario,
      messages: dialogue,
    });

    await prisma.practiceEvaluation.upsert({
      where: { sessionId },
      update: {
        overallScore: result.overallScore,
        categoryScores: JSON.stringify(result.categoryScores),
        strengths: JSON.stringify(result.strengths),
        weaknesses: JSON.stringify(result.weaknesses),
        recommendations: JSON.stringify(result.recommendations),
        suggestedResponses: JSON.stringify(result.suggestedResponses),
        missedOpportunities: JSON.stringify(result.missedOpportunities),
        objectiveAssessment: JSON.stringify(result.objectiveAssessment),
        coachingRecommendations: JSON.stringify(result.coachingRecommendations),
        trainingWarnings: JSON.stringify(result.trainingWarnings),
        evaluationMode: result.evaluationMode,
        demoMode: result.demoMode,
        model: result.model,
        errorMessage: null,
      },
      create: {
        sessionId,
        overallScore: result.overallScore,
        categoryScores: JSON.stringify(result.categoryScores),
        strengths: JSON.stringify(result.strengths),
        weaknesses: JSON.stringify(result.weaknesses),
        recommendations: JSON.stringify(result.recommendations),
        suggestedResponses: JSON.stringify(result.suggestedResponses),
        missedOpportunities: JSON.stringify(result.missedOpportunities),
        objectiveAssessment: JSON.stringify(result.objectiveAssessment),
        coachingRecommendations: JSON.stringify(result.coachingRecommendations),
        trainingWarnings: JSON.stringify(result.trainingWarnings),
        evaluationMode: result.evaluationMode,
        demoMode: result.demoMode,
        model: result.model,
      },
    });

    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: "evaluated",
        evaluationStatus: "evaluated",
      },
    });

    return getPracticeSession(sessionId);
  } catch (error) {
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: "evaluation_failed",
        evaluationStatus: "failed",
      },
    });
    await prisma.practiceEvaluation.upsert({
      where: { sessionId },
      update: {
        errorMessage: error.message,
        evaluationMode: "failed",
        demoMode: true,
        categoryScores: "[]",
        strengths: "[]",
        weaknesses: "[]",
        recommendations: "[]",
        suggestedResponses: "[]",
        missedOpportunities: "[]",
        objectiveAssessment: "{}",
        coachingRecommendations: "[]",
        trainingWarnings: "[]",
      },
      create: {
        sessionId,
        errorMessage: error.message,
        evaluationMode: "failed",
        demoMode: true,
        categoryScores: "[]",
        strengths: "[]",
        weaknesses: "[]",
        recommendations: "[]",
        suggestedResponses: "[]",
        missedOpportunities: "[]",
        objectiveAssessment: "{}",
        coachingRecommendations: "[]",
        trainingWarnings: "[]",
      },
    });
    throw error;
  }
}

export async function listPracticeSessions(filters = {}) {
  const where = {};
  if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
  if (filters.callType && filters.callType !== "all") where.callType = filters.callType;
  if (filters.difficulty && filters.difficulty !== "all") where.difficulty = filters.difficulty;
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.scenarioId && filters.scenarioId !== "all") where.scenarioId = filters.scenarioId;
  if (filters.q) {
    where.OR = [
      { scenarioName: { contains: filters.q, mode: "insensitive" } },
      { representativeName: { contains: filters.q, mode: "insensitive" } },
      { participantName: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const sessions = await prisma.practiceSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Number(filters.limit) || 100,
    include: {
      evaluation: { select: { overallScore: true, evaluationMode: true, demoMode: true } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationSec: s.durationSec,
    representativeName: s.representativeName,
    callType: s.callType,
    scenarioId: s.scenarioId,
    scenarioName: s.scenarioName,
    difficulty: s.difficulty,
    status: s.status,
    evaluationStatus: s.evaluationStatus,
    overallScore: s.evaluation?.overallScore ?? null,
    evaluationMode: s.evaluation?.evaluationMode ?? null,
  }));
}

export async function getPracticeAnalytics({ ownerUserId } = {}) {
  const sessions = await prisma.practiceSession.findMany({
    where: ownerUserId ? { ownerUserId } : undefined,
    include: { evaluation: true },
    orderBy: { createdAt: "asc" },
  });

  const completed = sessions.filter((s) => ["evaluated", "completed", "evaluation_pending", "abandoned"].includes(s.status));
  const evaluated = sessions.filter((s) => s.evaluation?.overallScore != null);
  const scores = evaluated.map((s) => s.evaluation.overallScore);
  const totalPracticeTime = sessions.reduce((acc, s) => acc + (s.durationSec || 0), 0);

  const byType = {};
  const byDifficulty = {};
  for (const s of evaluated) {
    byType[s.callType] = byType[s.callType] || { sum: 0, count: 0 };
    byType[s.callType].sum += s.evaluation.overallScore;
    byType[s.callType].count += 1;
    byDifficulty[s.difficulty] = byDifficulty[s.difficulty] || { sum: 0, count: 0 };
    byDifficulty[s.difficulty].sum += s.evaluation.overallScore;
    byDifficulty[s.difficulty].count += 1;
  }

  const trend = evaluated.slice(-12).map((s, i) => ({
    point: `S${i + 1}`,
    score: s.evaluation.overallScore,
    callType: s.callType,
    difficulty: s.difficulty,
  }));

  const coachingCounts = {};
  for (const s of evaluated) {
    try {
      const recs = JSON.parse(s.evaluation.recommendations || "[]");
      for (const r of recs) {
        const key = String(r).slice(0, 80);
        coachingCounts[key] = (coachingCounts[key] || 0) + 1;
      }
    } catch {
      /* ignore */
    }
  }

  const commonCoaching = Object.entries(coachingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => ({ text, count }));

  return {
    stats: {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      evaluatedSessions: evaluated.length,
      averageScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      bestScore: scores.length ? Math.max(...scores) : null,
      totalPracticeTimeSec: totalPracticeTime,
    },
    trend,
    byCallType: Object.entries(byType).map(([type, v]) => ({
      type,
      score: Math.round((v.sum / v.count) * 10) / 10,
      count: v.count,
    })),
    byDifficulty: Object.entries(byDifficulty).map(([difficulty, v]) => ({
      difficulty,
      score: Math.round((v.sum / v.count) * 10) / 10,
      count: v.count,
    })),
    commonCoaching,
  };
}
