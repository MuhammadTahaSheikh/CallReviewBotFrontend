/** Default policy settings — JS policy engine owns permissions, not the LLM. */

export const DEFAULT_POLICY = {
  qaSampleRatePercent: 5,
  autoCreateCrmTasks: true,
  autoCreateCoachingTasks: true,
  autoQueueCustomerDrafts: true,
  neverSendCustomerMessages: true,
  requireHumanReviewForHighRisk: true,
  queueMediumRisk: false,
  highRiskKeywords: [
    "refund",
    "chargeback",
    "lawyer",
    "lawsuit",
    "attorney",
    "sue",
    "malpractice",
    "hipaa",
  ],
  mediumRiskKeywords: ["angry", "furious", "unacceptable", "complaint"],
};

export const EXCEPTION_TRANSITIONS = {
  pending_review: ["in_review", "approved", "rejected", "resolved"],
  in_review: ["approved", "rejected", "resolved"],
  approved: [],
  rejected: [],
  resolved: [],
};

export const ACTION_TYPES = {
  crm_follow_up: "crm_follow_up",
  coaching: "coaching",
  customer_draft: "customer_draft",
};
