import { createHash } from "crypto";
import { ACTION_TYPES, DEFAULT_POLICY } from "./defaults";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordHit(text, keywords = []) {
  const haystack = (text || "").toLowerCase();
  return keywords.filter((kw) => {
    const needle = String(kw || "").trim().toLowerCase();
    if (!needle) return false;
    const re = new RegExp(`\\b${escapeRegex(needle)}\\b`, "i");
    return re.test(haystack);
  });
}

/**
 * Deterministic QA sample decision from call id + configured percent.
 */
export function shouldQaSample(callId, qaSampleRatePercent = 0) {
  const rate = Math.max(0, Math.min(100, Number(qaSampleRatePercent) || 0));
  if (rate <= 0) return false;
  if (rate >= 100) return true;
  const hash = createHash("sha256").update(String(callId)).digest();
  const bucket = hash.readUInt32BE(0) % 100;
  return bucket < rate;
}

/**
 * Assess risk from transcript + model-reported risks using policy keywords.
 * Policy engine decides risk — LLM suggestions are inputs only.
 */
export function assessRisk({ transcript = "", analysisRisks = [], policy = DEFAULT_POLICY }) {
  const reasons = [];
  const highHits = keywordHit(transcript, policy.highRiskKeywords);
  const mediumHits = keywordHit(transcript, policy.mediumRiskKeywords);

  if (highHits.length) {
    reasons.push(`High-risk keywords in transcript: ${highHits.join(", ")}`);
  }
  if (mediumHits.length) {
    reasons.push(`Elevated complaint language: ${mediumHits.join(", ")}`);
  }

  const joinedModelRisks = (analysisRisks || []).join(" ").toLowerCase();
  for (const kw of policy.highRiskKeywords || []) {
    if (joinedModelRisks.includes(String(kw).toLowerCase())) {
      reasons.push(`Model risk mention: ${kw}`);
    }
  }

  // Also keep explicit model risk strings
  for (const risk of analysisRisks || []) {
    if (!reasons.includes(risk)) reasons.push(risk);
  }

  let level = "low";
  if (highHits.length || /(refund|chargeback|lawyer|lawsuit|attorney|sue|malpractice|hipaa)/i.test(joinedModelRisks)) {
    level = "high";
  } else if (mediumHits.length || reasons.length) {
    level = "medium";
  }

  return {
    level,
    reasons: [...new Set(reasons)],
  };
}

/**
 * Decide routing: auto-complete vs human exception queue.
 */
export function decideRouting({ riskLevel, policy = DEFAULT_POLICY, callId, forcedReasons = [] }) {
  const reasons = [...forcedReasons];
  let requireHumanReview = false;
  let route = "auto";

  if (riskLevel === "high" && policy.requireHumanReviewForHighRisk !== false) {
    requireHumanReview = true;
    route = "exception";
    reasons.push("High-risk call requires human review");
  } else if (riskLevel === "medium" && policy.queueMediumRisk) {
    requireHumanReview = true;
    route = "exception";
    reasons.push("Medium-risk call queued by policy");
  } else if (shouldQaSample(callId, policy.qaSampleRatePercent)) {
    requireHumanReview = true;
    route = "exception";
    reasons.push(`Deterministic QA sample (${policy.qaSampleRatePercent}%)`);
  }

  return {
    requireHumanReview,
    route,
    reasons: [...new Set(reasons)],
    callStatus: requireHumanReview ? "exception" : "completed",
  };
}

/**
 * Decide whether a proposed action may auto-execute.
 * Customer drafts never send — only local queue.
 */
export function evaluateActionPermission({ actionType, routing, policy = DEFAULT_POLICY }) {
  const type = actionType;
  const base = {
    type,
    allowed: false,
    autoExecute: false,
    statusIfBlocked: "blocked",
    reason: "",
  };

  if (type === ACTION_TYPES.crm_follow_up) {
    if (!policy.autoCreateCrmTasks) {
      return { ...base, reason: "CRM tasks disabled in policy settings" };
    }
    if (routing.requireHumanReview) {
      return {
        ...base,
        allowed: true,
        autoExecute: false,
        reason: "Awaiting human approval before CRM task execution",
      };
    }
    return {
      ...base,
      allowed: true,
      autoExecute: true,
      reason: "Routine low-risk CRM follow-up permitted",
    };
  }

  if (type === ACTION_TYPES.coaching) {
    if (!policy.autoCreateCoachingTasks) {
      return { ...base, reason: "Coaching tasks disabled in policy settings" };
    }
    if (routing.requireHumanReview) {
      return {
        ...base,
        allowed: true,
        autoExecute: false,
        reason: "Awaiting human approval before coaching task execution",
      };
    }
    return {
      ...base,
      allowed: true,
      autoExecute: true,
      reason: "Routine coaching task permitted",
    };
  }

  if (type === ACTION_TYPES.customer_draft) {
    if (!policy.autoQueueCustomerDrafts) {
      return { ...base, reason: "Customer draft queue disabled in policy settings" };
    }
    // Hard rule: never send
    if (policy.neverSendCustomerMessages === false) {
      // Still never send in this prototype — ignore unsafe setting
    }
    if (routing.requireHumanReview) {
      return {
        ...base,
        allowed: true,
        autoExecute: false,
        reason: "Customer draft blocked until exception approval (never sent)",
      };
    }
    return {
      ...base,
      allowed: true,
      autoExecute: true,
      reason: "Customer follow-up draft queued locally (never sent)",
    };
  }

  return { ...base, reason: `Unknown action type: ${type}` };
}

/**
 * Full policy decision for a finished analysis.
 */
export function runPolicyEngine({
  callId,
  transcript,
  analysisRisks = [],
  proposedActions = [],
  policy = DEFAULT_POLICY,
}) {
  const risk = assessRisk({ transcript, analysisRisks, policy });
  const routing = decideRouting({
    riskLevel: risk.level,
    policy,
    callId,
    forcedReasons: risk.reasons,
  });

  const actions = (proposedActions || []).map((action) => {
    const decision = evaluateActionPermission({
      actionType: action.type,
      routing,
      policy,
    });
    return {
      ...action,
      decision,
    };
  });

  return {
    riskLevel: risk.level,
    riskReasons: risk.reasons,
    routing,
    actions,
    policySnapshot: {
      qaSampleRatePercent: policy.qaSampleRatePercent,
      autoCreateCrmTasks: policy.autoCreateCrmTasks,
      autoCreateCoachingTasks: policy.autoCreateCoachingTasks,
      autoQueueCustomerDrafts: policy.autoQueueCustomerDrafts,
      neverSendCustomerMessages: true,
      queueMediumRisk: Boolean(policy.queueMediumRisk),
    },
  };
}
