/** Canonical scoring profile definitions (also seeded into DB). */

export const SCORING_PROFILE_DEFINITIONS = [
  {
    callType: "sales",
    label: "Sales Call",
    description: "Outbound/inbound sales discovery and close",
    categories: [
      { key: "discovery", label: "Discovery", weight: 25 },
      { key: "communication", label: "Communication", weight: 20 },
      { key: "objectionHandling", label: "Objection Handling", weight: 20 },
      { key: "closing", label: "Closing", weight: 25 },
      { key: "followUp", label: "Follow-up", weight: 10 },
    ],
  },
  {
    callType: "support",
    label: "Customer Support Call",
    description: "Issue resolution and empathy",
    categories: [
      { key: "problemUnderstanding", label: "Problem Understanding", weight: 25 },
      { key: "empathy", label: "Empathy", weight: 20 },
      { key: "resolution", label: "Resolution", weight: 30 },
      { key: "communication", label: "Communication", weight: 15 },
      { key: "escalation", label: "Escalation", weight: 10 },
    ],
  },
  {
    callType: "booking",
    label: "Booking/Appointment Call",
    description: "Scheduling accuracy and next steps",
    categories: [
      { key: "requirements", label: "Requirements", weight: 25 },
      { key: "informationAccuracy", label: "Information Accuracy", weight: 25 },
      { key: "bookingProcess", label: "Booking Process", weight: 20 },
      { key: "communication", label: "Communication", weight: 15 },
      { key: "nextSteps", label: "Next Steps", weight: 15 },
    ],
  },
  {
    callType: "consultation",
    label: "Consultation Call",
    description: "Needs assessment and recommendations",
    categories: [
      { key: "needsAssessment", label: "Needs Assessment", weight: 30 },
      { key: "explanationQuality", label: "Explanation Quality", weight: 25 },
      { key: "recommendations", label: "Recommendations", weight: 20 },
      { key: "communication", label: "Communication", weight: 15 },
      { key: "followUp", label: "Follow-up", weight: 10 },
    ],
  },
  {
    callType: "internal",
    label: "Internal Team Meeting",
    description: "Agenda, decisions, and ownership",
    categories: [
      { key: "agenda", label: "Agenda", weight: 15 },
      { key: "discussion", label: "Discussion", weight: 20 },
      { key: "decisionClarity", label: "Decision Clarity", weight: 25 },
      { key: "actionItems", label: "Action Items", weight: 25 },
      { key: "ownership", label: "Ownership", weight: 15 },
    ],
  },
];

export function assertWeightsSumTo100(categories) {
  const sum = categories.reduce((acc, cat) => acc + Number(cat.weight || 0), 0);
  if (sum !== 100) {
    throw new Error(`Scoring weights must sum to 100 (got ${sum})`);
  }
}

/**
 * Weighted total from category scores.
 * Provisional rule for N/A: redistribute remaining weight across scored categories only.
 * If no scored categories, return null.
 */
export function computeWeightedScore(categoryScores) {
  const scored = categoryScores.filter((c) => c.score != null && !Number.isNaN(Number(c.score)));
  if (scored.length === 0) return null;

  const weightSum = scored.reduce((acc, c) => acc + Number(c.weight), 0);
  if (weightSum <= 0) return null;

  const total = scored.reduce((acc, c) => acc + (Number(c.score) * Number(c.weight)) / weightSum, 0);
  return Math.round(total * 10) / 10;
}

export function getProfileDefinition(callType) {
  return SCORING_PROFILE_DEFINITIONS.find((p) => p.callType === callType) || null;
}
