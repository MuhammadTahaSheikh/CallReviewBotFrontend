import { getProfileDefinition } from "../scoring-profiles";

function pickEvidence(transcript, needles) {
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const needle of needles) {
    const hit = lines.find((line) => line.toLowerCase().includes(needle.toLowerCase()));
    if (hit) return hit.slice(0, 160);
  }

  return lines[0]?.slice(0, 160) || null;
}

function hashScore(text, salt, min = 55, max = 94) {
  let h = 0;
  const raw = `${salt}:${text}`;
  for (let i = 0; i < raw.length; i += 1) {
    h = (h * 31 + raw.charCodeAt(i)) % 1000;
  }
  const span = max - min;
  return min + (h % (span + 1));
}

function detectRiskHints(transcript) {
  const lower = transcript.toLowerCase();
  const risks = [];
  if (/(refund|chargeback|lawyer|lawsuit|attorney|sue)/i.test(lower)) {
    risks.push("Caller referenced refund dispute or legal escalation");
  }
  if (/(angry|furious|unacceptable|complaint)/i.test(lower)) {
    risks.push("Elevated complaint language detected");
  }
  if (/(contradict|actually i said|that's not what)/i.test(lower)) {
    risks.push("Possible contradictory facts in conversation");
  }
  return risks;
}

/**
 * Deterministic, clearly synthetic analysis for UI/dev without API credits.
 * Never claim these are real model evaluations.
 */
export async function analyzeWithDemo({ transcript, callType, title }) {
  const started = Date.now();
  const profile = getProfileDefinition(callType);
  if (!profile) {
    throw new Error(`Unknown call type: ${callType}`);
  }

  const risks = detectRiskHints(transcript);
  const complaintHeavy = risks.length > 0;

  const categoryScores = profile.categories.map((cat, index) => {
    let score = hashScore(transcript, `${callType}:${cat.key}`);
    if (complaintHeavy && index < 2) score = Math.max(45, score - 18);
    if (transcript.length < 120) score = null;

    const evidenceQuote =
      score == null
        ? null
        : pickEvidence(transcript, [cat.label.split(" ")[0], "thanks", "help", "cost", "book", "okay"]);

    return {
      key: cat.key,
      label: cat.label,
      weight: cat.weight,
      score,
      justification:
        score == null
          ? "Insufficient transcript content to judge this category (N/A)."
          : `Demo heuristic score for ${cat.label} based on transcript length and keywords.`,
      evidenceQuote,
    };
  });

  const analysis = {
    summary: `DEMO ANALYSIS (not a live model evaluation): "${title}" was treated as a ${profile.label.toLowerCase()}. The representative covered core conversation beats; scores are synthetic and deterministic for local development.`,
    purpose: `Handle a ${profile.label.toLowerCase()} and capture clear next steps.`,
    categoryScores,
    strengths: [
      {
        text: "Greeting and intent acknowledgment present in the transcript",
        evidence: pickEvidence(transcript, ["thanks", "help", "calling", "hi"]),
      },
      {
        text: "At least one concrete next-step or clarifying exchange appears",
        evidence: pickEvidence(transcript, ["would", "can you", "schedule", "follow"]),
      },
    ],
    weaknesses: complaintHeavy
      ? [
          {
            text: "Risk language suggests de-escalation and verification were incomplete",
            evidence: pickEvidence(transcript, ["refund", "lawyer", "angry", "complaint"]),
          },
        ]
      : [
          {
            text: "Closing/confirmation could be stated more explicitly",
            evidence: pickEvidence(transcript, ["maybe", "email", "okay"]),
          },
        ],
    recommendations: complaintHeavy
      ? [
          "Acknowledge the concern, restate facts, and route to a human exception reviewer before any customer-facing draft.",
          "Create an internal coaching task focused on de-escalation language.",
        ]
      : [
          "Confirm the agreed next step on-call and restate date/time or owner.",
          "Ask one deeper discovery/clarifying question before presenting options.",
        ],
    followUpOpportunities: ["Send a confirmation summary", "Offer an alternate channel if needed"],
    risks,
    missingInformation: transcript.toLowerCase().includes("insurance")
      ? []
      : ["Insurance or account identifiers were not collected (if applicable)"],
    proposedActions: [
      {
        type: "crm_follow_up",
        label: "Create CRM follow-up task",
        reason: "Routine post-call follow-up",
      },
      {
        type: "coaching",
        label: complaintHeavy ? "Create coaching task on de-escalation" : "Create coaching task on closing clarity",
        reason: complaintHeavy ? "Complaint/risk language" : "Minor closing gap",
      },
      ...(complaintHeavy
        ? []
        : [
            {
              type: "customer_draft",
              label: "Queue customer follow-up draft (never send)",
              reason: "Local outbound draft only",
            },
          ]),
    ],
  };

  return {
    analysis,
    meta: {
      demoMode: true,
      model: "demo-synthetic",
      latencyMs: Date.now() - started,
      inputTokens: null,
      outputTokens: null,
    },
  };
}
