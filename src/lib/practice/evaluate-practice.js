import { getProfileDefinition, computeWeightedScore, assertWeightsSumTo100 } from "../scoring-profiles";
import { runCallAnalysis } from "../ai/provider";

/**
 * Evaluate a practice transcript using the existing analysis adapter + weighted scoring.
 * CRITICAL: does NOT create Call records, CRM tasks, exceptions, or automation executions.
 * Coaching (strengths / weaknesses / suggestions) is grounded in the TRAINEE's replies only.
 */
export async function evaluatePracticeTranscript({
  callType,
  title,
  transcript,
  scenario,
  messages,
}) {
  const profile = getProfileDefinition(callType);
  if (!profile) throw new Error(`Unknown call type: ${callType}`);
  assertWeightsSumTo100(profile.categories);

  const reps = representativeMessages(messages);
  // Feed the model a trainee-first transcript so evidence cannot latch onto customer lines
  const traineeFocusedTranscript = buildTraineeFocusedTranscript(messages);

  const { analysis, meta, mode } = await runCallAnalysis({
    transcript: traineeFocusedTranscript || transcript,
    callType,
    title: `[PRACTICE] ${title}`,
  });

  const byKey = new Map(profile.categories.map((c) => [c.key, c]));
  const categoryScores = analysis.categoryScores.map((score) => {
    const def = byKey.get(score.key);
    return {
      key: score.key,
      label: def?.label || score.label,
      weight: def?.weight ?? score.weight,
      score: score.score,
      justification: rewriteJustification(score, reps),
      evidenceQuote: pickRepEvidence(reps, evidenceNeedlesForCategory(score)) || null,
      evidenceVerified: Boolean(reps.length),
    };
  });

  const overallScore = computeWeightedScore(categoryScores);
  const coaching = buildTraineeCoaching(reps, scenario, messages);

  return {
    overallScore,
    categoryScores,
    strengths: coaching.strengths,
    weaknesses: coaching.weaknesses,
    recommendations: coaching.recommendations,
    suggestedResponses: coaching.suggestedResponses,
    missedOpportunities: coaching.missedOpportunities,
    objectiveAssessment: assessObjectives(messages, scenario),
    coachingRecommendations: coaching.recommendations,
    trainingWarnings: buildTrainingWarnings(reps),
    evaluationMode: mode,
    demoMode: Boolean(meta.demoMode),
    model: meta.model || null,
    latencyMs: meta.latencyMs ?? null,
  };
}

function representativeMessages(messages) {
  return (messages || []).filter((m) => m.role === "representative" && String(m.content || "").trim());
}

function buildTranscriptFromMessages(messages) {
  return messages
    .filter((m) => m.role === "representative" || m.role === "participant")
    .map((m) => {
      const label = m.role === "representative" ? "Representative" : "Simulated Participant";
      return `${label}: ${m.content}`;
    })
    .join("\n");
}

/** Prefer trainee lines; keep short participant context labeled so quotes stay on "You said". */
function buildTraineeFocusedTranscript(messages) {
  const lines = [];
  for (const m of messages || []) {
    if (m.role === "representative") {
      lines.push(`You (Representative): ${m.content}`);
    } else if (m.role === "participant") {
      lines.push(`Customer context (do not quote as trainee evidence): ${m.content}`);
    }
  }
  return lines.join("\n");
}

export function messagesToTranscript(messages) {
  return buildTranscriptFromMessages(messages);
}

function pickRepEvidence(reps, needles = []) {
  if (!reps.length) return null;
  for (const needle of needles) {
    if (!needle) continue;
    const hit = reps.find((m) => m.content.toLowerCase().includes(String(needle).toLowerCase()));
    if (hit) return `You said: ${hit.content}`.slice(0, 200);
  }
  return `You said: ${reps[reps.length - 1].content}`.slice(0, 200);
}

function evidenceNeedlesForCategory(score) {
  const key = String(score.key || "").toLowerCase();
  const label = String(score.label || "").toLowerCase();
  if (key.includes("discover") || label.includes("discover")) return ["what", "tell me", "how", "need", "challenge"];
  if (key.includes("empath") || key.includes("rapport") || label.includes("empath")) {
    return ["understand", "sorry", "hear", "appreciate"];
  }
  if (key.includes("clos") || key.includes("next") || label.includes("clos")) {
    return ["next", "schedule", "book", "follow", "demo", "confirm"];
  }
  if (key.includes("object") || key.includes("price") || label.includes("object")) {
    return ["price", "cost", "budget", "compare", "option", "value"];
  }
  return ["i ", "we ", "can", "will", "let"];
}

function rewriteJustification(score, reps) {
  if (score.score == null) {
    return "Not enough of your replies to score this category yet.";
  }
  if (!reps.length) {
    return "No representative replies were captured for this practice session.";
  }
  return `Scored from your ${reps.length} reply(ies) as the trainee — not from the simulated customer.`;
}

function buildTraineeCoaching(reps, scenario, messages) {
  const text = reps.map((m) => m.content).join(" ").toLowerCase();
  const expected = scenario?.expectedBehaviors || [];
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  const hasGreeting = /(hi|hello|good morning|good afternoon|thanks for|my name)/i.test(text);
  const hasEmpathy = /(understand|sorry|hear you|appreciate|that makes sense|i get)/i.test(text);
  const hasDiscovery = /(what|tell me|how are|how can|could you|need|challenge|prefer|when)/i.test(text);
  const hasClosing = /(next step|schedule|book|follow up|demo|pilot|confirm|i will|i'll send)/i.test(text);
  const hasObjection = /(price|cost|budget|compare|option|value|include)/i.test(text);
  const hasWeakPhrase = /(calm down|whatever|i don't know|just better|not my problem|can't help)/i.test(text);

  if (hasGreeting) {
    strengths.push({
      text: "You opened clearly in your own words",
      evidence: pickRepEvidence(reps, ["hi", "hello", "thanks", "good", "my name"]),
    });
  }
  if (hasEmpathy) {
    strengths.push({
      text: "You acknowledged the other person with empathy",
      evidence: pickRepEvidence(reps, ["understand", "sorry", "hear", "appreciate", "makes sense"]),
    });
  }
  if (hasDiscovery) {
    strengths.push({
      text: "You asked discovery or clarifying questions",
      evidence: pickRepEvidence(reps, ["what", "tell me", "how", "need", "when", "could you"]),
    });
  }
  if (hasClosing) {
    strengths.push({
      text: "You proposed a concrete next step",
      evidence: pickRepEvidence(reps, ["next", "schedule", "book", "follow", "demo", "confirm", "i'll", "i will"]),
    });
  }
  if (hasObjection && (expected.includes("objection_handling") || scenario?.callType === "sales")) {
    strengths.push({
      text: "You addressed value, price, or options in your reply",
      evidence: pickRepEvidence(reps, ["price", "cost", "budget", "compare", "option", "value"]),
    });
  }

  if (!strengths.length && reps.length) {
    strengths.push({
      text: "You stayed engaged and replied as the representative",
      evidence: pickRepEvidence(reps),
    });
  }
  if (!reps.length) {
    strengths.push({
      text: "No trainee replies were recorded to highlight yet",
      evidence: null,
    });
  }

  if (!hasEmpathy && (expected.includes("empathy") || scenario?.callType === "support" || scenario?.callType === "complaint")) {
    weaknesses.push({
      text: "Your replies did not clearly acknowledge the customer's emotion",
      evidence: pickRepEvidence(reps) || "No empathy phrase found in your replies",
    });
    recommendations.push("In your next reply, name the concern first (“I understand this is frustrating…”) before solving.");
  }
  if (!hasDiscovery && (expected.includes("discovery") || expected.includes("clarifying"))) {
    weaknesses.push({
      text: "You moved ahead without enough discovery in your own questions",
      evidence: pickRepEvidence(reps) || "No clarifying question found in your replies",
    });
    recommendations.push("Ask one specific clarifying question before offering a plan or product pitch.");
  }
  if (!hasClosing && (expected.includes("closing") || expected.includes("next_step"))) {
    weaknesses.push({
      text: "You did not lock a clear next step in your own words",
      evidence: pickRepEvidence(reps) || "No next-step phrase found in your replies",
    });
    recommendations.push("End with a concrete close: owner + action + timing (“I'll send X today and we can meet Tuesday at 2.”).");
  }
  if (!hasObjection && expected.includes("objection_handling")) {
    weaknesses.push({
      text: "You did not directly handle the stated objection in your replies",
      evidence: pickRepEvidence(reps) || "No objection-handling language found in your replies",
    });
    recommendations.push("Restate their objection in your words, then compare options or value before asking to proceed.");
  }
  if (hasWeakPhrase) {
    weaknesses.push({
      text: "Some of your wording sounded dismissive or uncertain",
      evidence: pickRepEvidence(reps, ["calm down", "whatever", "i don't know", "just better", "not my problem", "can't help"]),
    });
    recommendations.push("Replace dismissive lines with acknowledgment + ownership (“Here's what I can do next…”).");
  }
  if (reps.length < 2) {
    weaknesses.push({
      text: "You only sent a short reply — hard to practice full call skills",
      evidence: pickRepEvidence(reps) || "Fewer than two representative replies",
    });
    recommendations.push("Practice longer: greeting → clarify → handle concern → confirm next step.");
  }

  if (!weaknesses.length) {
    weaknesses.push({
      text: "No major wording gaps in your replies — stretch by tightening the close",
      evidence: pickRepEvidence(reps),
    });
  }
  if (!recommendations.length) {
    recommendations.push("Replay the call and upgrade your last reply with empathy + one clarifying question + a timed next step.");
  }

  return {
    strengths,
    weaknesses,
    recommendations,
    suggestedResponses: buildSuggestedResponses(reps, scenario, messages),
    missedOpportunities: buildMissedOpportunities(reps, scenario),
  };
}

function buildSuggestedResponses(reps, scenario, messages) {
  if (!reps.length) {
    return [
      {
        original: null,
        suggested:
          "Hi — thanks for sharing that. I want to make sure I understand, then I'll outline a clear next step with timing.",
        why: "You had no trainee replies to rewrite, so this is a starter pattern for your first turn.",
      },
    ];
  }

  const weak = reps.find((m) =>
    /expensive|just better|calm down|whatever|i don't know|not my problem|can't help/i.test(m.content)
  );
  const thin = reps.find((m) => m.content.trim().split(/\s+/).length < 8);
  const target = weak || thin || reps[reps.length - 1];
  const lastCustomer = [...(messages || [])]
    .reverse()
    .find((m) => m.role === "participant" && m.content?.trim());

  const salesSuggested =
    "I hear that budget matters. If I walk through what's included and which parts would help your follow-up most, we can decide whether a short demo this week makes sense.";
  const supportSuggested =
    "I'm sorry this happened — thank you for telling me. Let me confirm the key details, explain what I can do from here, and give you a clear timeline.";
  const genericSuggested =
    "I understand the concern. Can I ask one clarifying question, then propose a concrete next step with timing so you know what happens next?";

  let suggested = genericSuggested;
  if (scenario?.callType === "sales") suggested = salesSuggested;
  if (scenario?.callType === "support" || scenario?.callType === "complaint") suggested = supportSuggested;
  if (lastCustomer && /refund|lawyer|escalate|unacceptable/i.test(lastCustomer.content)) {
    suggested =
      "I understand why you'd want this fixed quickly. I can't promise an outcome I don't control, but I will verify the charge details now and tell you the exact next step and timing.";
  }

  return [
    {
      original: target.content,
      suggested,
      why: "This rewrites YOUR line — keep their context in mind, but practice saying the improved version yourself.",
    },
  ];
}

function buildMissedOpportunities(reps, scenario) {
  const text = reps.map((m) => m.content).join(" ").toLowerCase();
  const missed = [];
  const expected = scenario?.expectedBehaviors || [];
  const checks = [
    { key: "discovery", test: /(what|tell me|how are|challenge|need)/i, label: "Ask a discovery/clarifying question (in your reply)" },
    { key: "empathy", test: /(understand|hear you|appreciate|sorry)/i, label: "Show empathy or acknowledgment (in your reply)" },
    { key: "closing", test: /(next step|schedule|book|follow up|demo|pilot)/i, label: "Establish a clear next step (in your reply)" },
    { key: "objection_handling", test: /(price|concern|compare|option|budget|value)/i, label: "Address stated objections directly (in your reply)" },
  ];
  for (const check of checks) {
    if (expected.includes(check.key) || expected.includes(check.key.replace("_", ""))) {
      if (!check.test.test(text)) missed.push(check.label);
    }
  }
  if (!missed.length && reps.length < 2) {
    missed.push("Send more of your own replies so discovery and closing can be coached");
  }
  return missed;
}

function assessObjectives(messages, scenario) {
  const conditions = scenario?.completionConditions || [];
  const reps = representativeMessages(messages);
  const text = reps.map((m) => m.content).join(" ").toLowerCase();

  const results = conditions.map((condition) => {
    const met = heuristicCondition(condition, text);
    return {
      condition,
      met,
      evidence: met
        ? pickRepEvidence(reps) || "Shown in your replies"
        : "Not clearly demonstrated in your representative replies",
    };
  });

  const metCount = results.filter((r) => r.met).length;
  return {
    objective: scenario?.objective || "",
    scorePercent: conditions.length ? Math.round((metCount / conditions.length) * 100) : null,
    results,
  };
}

function heuristicCondition(condition, text) {
  const c = condition.toLowerCase();
  if (c.includes("discovery") || c.includes("needs") || c.includes("clarif")) {
    return /(what|tell me|how|challenge|need|prefer)/.test(text);
  }
  if (c.includes("empathy") || c.includes("acknowledged") || c.includes("emotion") || c.includes("apolog")) {
    return /(understand|sorry|appreciate|hear)/.test(text);
  }
  if (c.includes("next") || c.includes("closing") || c.includes("confirm") || c.includes("follow")) {
    return /(next step|schedule|book|follow|confirm|send|demo|pilot|tuesday|monday)/.test(text);
  }
  if (c.includes("value") || c.includes("differentiated") || c.includes("price") || c.includes("objection")) {
    return /(value|because|compare|include|option|price|budget)/.test(text);
  }
  if (c.includes("owner") || c.includes("status") || c.includes("risk") || c.includes("recovery")) {
    return /(status|risk|owner|by |plan|due)/.test(text);
  }
  return text.length > 40;
}

/** Only warn when the TRAINEE used high-risk language — not the simulated customer. */
function buildTrainingWarnings(reps) {
  const warnings = [];
  const text = reps.map((m) => m.content).join("\n");
  if (/(refund|lawyer|lawsuit|sue|chargeback)/i.test(text)) {
    warnings.push({
      type: "high_risk_language_practice",
      message:
        "High-risk wording appeared in YOUR replies. Treat this as coaching only — practice sessions never create operational exception tickets.",
    });
  }
  return warnings;
}
