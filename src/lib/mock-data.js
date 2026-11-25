/** Synthetic demo data for UI development. Labeled as demo — not real evaluations. */

export const DEMO_BUSINESS = {
  id: "biz_demo_001",
  name: "Northstar Clinic",
};

export const DEMO_REVIEWER = {
  id: "user_demo_reviewer",
  name: "Alex Reviewer",
  role: "Local Demo Reviewer",
};

export const CALL_TYPES = [
  { id: "sales", label: "Sales Call" },
  { id: "support", label: "Customer Support Call" },
  { id: "booking", label: "Booking/Appointment Call" },
  { id: "consultation", label: "Consultation Call" },
  { id: "internal", label: "Internal Team Meeting" },
];

export const SCORING_PROFILES = {
  sales: {
    label: "Sales Call",
    categories: [
      { key: "discovery", label: "Discovery", weight: 25 },
      { key: "communication", label: "Communication", weight: 20 },
      { key: "objectionHandling", label: "Objection Handling", weight: 20 },
      { key: "closing", label: "Closing", weight: 25 },
      { key: "followUp", label: "Follow-up", weight: 10 },
    ],
  },
  support: {
    label: "Customer Support Call",
    categories: [
      { key: "problemUnderstanding", label: "Problem Understanding", weight: 25 },
      { key: "empathy", label: "Empathy", weight: 20 },
      { key: "resolution", label: "Resolution", weight: 30 },
      { key: "communication", label: "Communication", weight: 15 },
      { key: "escalation", label: "Escalation", weight: 10 },
    ],
  },
  booking: {
    label: "Booking/Appointment Call",
    categories: [
      { key: "requirements", label: "Requirements", weight: 25 },
      { key: "informationAccuracy", label: "Information Accuracy", weight: 25 },
      { key: "bookingProcess", label: "Booking Process", weight: 20 },
      { key: "communication", label: "Communication", weight: 15 },
      { key: "nextSteps", label: "Next Steps", weight: 15 },
    ],
  },
  consultation: {
    label: "Consultation Call",
    categories: [
      { key: "needsAssessment", label: "Needs Assessment", weight: 30 },
      { key: "explanationQuality", label: "Explanation Quality", weight: 25 },
      { key: "recommendations", label: "Recommendations", weight: 20 },
      { key: "communication", label: "Communication", weight: 15 },
      { key: "followUp", label: "Follow-up", weight: 10 },
    ],
  },
  internal: {
    label: "Internal Team Meeting",
    categories: [
      { key: "agenda", label: "Agenda", weight: 15 },
      { key: "discussion", label: "Discussion", weight: 20 },
      { key: "decisionClarity", label: "Decision Clarity", weight: 25 },
      { key: "actionItems", label: "Action Items", weight: 25 },
      { key: "ownership", label: "Ownership", weight: 15 },
    ],
  },
};

export const RECENT_CALLS = [
  {
    id: "call_001",
    title: "New patient inquiry — orthodontics",
    callType: "sales",
    representativeName: "Jordan Lee",
    score: 84,
    risk: "low",
    status: "completed",
    source: "manual",
    occurredAt: "2026-03-20T14:22:00Z",
  },
  {
    id: "call_002",
    title: "Billing dispute follow-up",
    callType: "support",
    representativeName: "Sam Ortiz",
    score: 61,
    risk: "high",
    status: "exception",
    source: "webhook",
    occurredAt: "2026-03-20T11:05:00Z",
  },
  {
    id: "call_003",
    title: "Hygiene appointment booking",
    callType: "booking",
    representativeName: "Casey Ng",
    score: 91,
    risk: "low",
    status: "completed",
    source: "webhook",
    occurredAt: "2026-03-19T16:40:00Z",
  },
  {
    id: "call_004",
    title: "Treatment plan consultation",
    callType: "consultation",
    representativeName: "Jordan Lee",
    score: 78,
    risk: "medium",
    status: "completed",
    source: "manual",
    occurredAt: "2026-03-19T10:15:00Z",
  },
  {
    id: "call_005",
    title: "Weekly front-desk huddle",
    callType: "internal",
    representativeName: "Morgan Blake",
    score: 72,
    risk: "low",
    status: "completed",
    source: "manual",
    occurredAt: "2026-03-18T09:00:00Z",
  },
];

export const OVERVIEW_STATS = {
  totalCalls: 128,
  averageScore: 79.4,
  flaggedCount: 9,
  taskCount: 34,
  successRate: 92.1,
  avgProcessingMs: 4200,
};

export const SCORE_TREND = [
  { day: "Mon", score: 76 },
  { day: "Tue", score: 81 },
  { day: "Wed", score: 78 },
  { day: "Thu", score: 83 },
  { day: "Fri", score: 80 },
  { day: "Sat", score: 77 },
  { day: "Sun", score: 82 },
];

export const SCORES_BY_TYPE = [
  { type: "Sales", score: 81 },
  { type: "Support", score: 74 },
  { type: "Booking", score: 88 },
  { type: "Consultation", score: 79 },
  { type: "Internal", score: 71 },
];

export const SCORE_DISTRIBUTION = [
  { bucket: "0–49", count: 4 },
  { bucket: "50–69", count: 18 },
  { bucket: "70–84", count: 62 },
  { bucket: "85–100", count: 44 },
];

export const TEAM_PERFORMANCE = [
  {
    id: "rep_001",
    name: "Jordan Lee",
    calls: 42,
    avgScore: 83.2,
    trend: [78, 80, 82, 85, 84, 83, 86],
    byType: { sales: 85, consultation: 81 },
  },
  {
    id: "rep_002",
    name: "Sam Ortiz",
    calls: 36,
    avgScore: 74.1,
    trend: [70, 72, 71, 75, 76, 74, 77],
    byType: { support: 74, booking: 79 },
  },
  {
    id: "rep_003",
    name: "Casey Ng",
    calls: 31,
    avgScore: 88.5,
    trend: [86, 87, 89, 88, 90, 89, 91],
    byType: { booking: 91, sales: 84 },
  },
  {
    id: "rep_004",
    name: "Morgan Blake",
    calls: 19,
    avgScore: 76.8,
    trend: [74, 75, 77, 76, 78, 77, 79],
    byType: { internal: 72, support: 80 },
  },
];

export const EXCEPTIONS = [
  {
    id: "exc_001",
    callId: "call_002",
    title: "Billing dispute follow-up",
    reason: "Serious complaint / refund dispute",
    risk: "high",
    status: "pending_review",
    representativeName: "Sam Ortiz",
    createdAt: "2026-03-20T11:06:00Z",
    proposedActions: [
      { id: "act_a1", type: "crm_follow_up", label: "Create CRM follow-up task", editable: true },
      { id: "act_a2", type: "coaching", label: "Create coaching task on de-escalation", editable: true },
      {
        id: "act_a3",
        type: "customer_draft",
        label: "Draft customer follow-up (never send)",
        editable: true,
      },
    ],
  },
  {
    id: "exc_002",
    callId: "call_006",
    title: "Contradictory appointment details",
    reason: "Contradictory facts in transcript",
    risk: "medium",
    status: "pending_review",
    representativeName: "Casey Ng",
    createdAt: "2026-03-19T15:20:00Z",
    proposedActions: [
      { id: "act_b1", type: "crm_follow_up", label: "Verify booking details in CRM", editable: true },
    ],
  },
  {
    id: "exc_003",
    callId: "call_007",
    title: "QA sample — routine sales call",
    reason: "Deterministic QA sample",
    risk: "low",
    status: "in_review",
    representativeName: "Jordan Lee",
    createdAt: "2026-03-18T13:00:00Z",
    proposedActions: [
      { id: "act_c1", type: "coaching", label: "Optional coaching on discovery depth", editable: true },
    ],
  },
];

export const AUTOMATION_LOG = [
  {
    id: "auto_001",
    callId: "call_001",
    action: "crm_follow_up",
    label: "CRM follow-up task created",
    status: "succeeded",
    timestamp: "2026-03-20T14:23:10Z",
    reason: "Routine low-risk sales call",
  },
  {
    id: "auto_002",
    callId: "call_001",
    action: "coaching",
    label: "Coaching task created",
    status: "succeeded",
    timestamp: "2026-03-20T14:23:11Z",
    reason: "Minor discovery gap detected",
  },
  {
    id: "auto_003",
    callId: "call_002",
    action: "exception_queue",
    label: "Routed to exception queue",
    status: "queued",
    timestamp: "2026-03-20T11:06:02Z",
    reason: "High-risk complaint language",
  },
  {
    id: "auto_004",
    callId: "call_003",
    action: "customer_draft",
    label: "Customer follow-up draft queued (not sent)",
    status: "succeeded",
    timestamp: "2026-03-19T16:41:05Z",
    reason: "Booking confirmation draft",
  },
  {
    id: "auto_005",
    callId: "call_008",
    action: "crm_follow_up",
    label: "CRM follow-up task failed",
    status: "failed",
    timestamp: "2026-03-18T12:10:00Z",
    reason: "Simulated idempotency conflict",
  },
];

export const CALL_DETAIL = {
  id: "call_001",
  title: "New patient inquiry — orthodontics",
  callType: "sales",
  representativeName: "Jordan Lee",
  businessName: DEMO_BUSINESS.name,
  source: "manual",
  status: "completed",
  risk: "low",
  score: 84,
  occurredAt: "2026-03-20T14:22:00Z",
  processedAt: "2026-03 of-20T14:22:08Z",
  demoMode: true,
  model: "demo-synthetic",
  latencyMs: 12,
  summary:
    "Representative greeted the caller, explored interest in adult braces, explained consultation options, and scheduled a follow-up. Closing could have been stronger with a firmer next-step commitment.",
  purpose: "Qualify interest in orthodontic treatment and book a consultation.",
  categoryScores: [
    { key: "discovery", label: "Discovery", weight: 25, score: 88, evidence: "What concerns you most about your smile right now?" },
    { key: "communication", label: "Communication", weight: 20, score: 90, evidence: "I'll keep this simple and walk through the options with you." },
    { key: "objectionHandling", label: "Objection Handling", weight: 20, score: 76, evidence: "Cost is a fair concern — we do offer payment plans." },
    { key: "closing", label: "Closing", weight: 25, score: 78, evidence: "Would Thursday afternoon work for a consult?" },
    { key: "followUp", label: "Follow-up", weight: 10, score: 92, evidence: "I'll send a confirmation and reminder before your visit." },
  ],
  strengths: [
    { text: "Clear discovery questions tied to patient goals", evidence: "What concerns you most about your smile right now?" },
    { text: "Transparent explanation of payment plans", evidence: "Cost is a fair concern — we do offer payment plans." },
  ],
  weaknesses: [
    { text: "Closing left the next step optional rather than confirmed", evidence: "Would Thursday afternoon work for a consult?" },
  ],
  recommendations: [
    "Confirm the appointment on-call and restate date/time.",
    "Ask one more question about timeline urgency before presenting options.",
  ],
  followUpOpportunities: ["Send consultation prep checklist", "Offer virtual consult if travel is a barrier"],
  risks: [],
  missingInformation: ["Insurance plan details not collected"],
  transcript: `Rep: Thanks for calling Northstar. How can I help today?
Caller: Hi, I'm interested in braces for myself. I'm 32.
Rep: Absolutely. What concerns you most about your smile right now?
Caller: Mostly crowding in the front, and cost.
Rep: Cost is a fair concern — we do offer payment plans. I'll keep this simple and walk through the options with you.
Caller: Okay.
Rep: Would Thursday afternoon work for a consult?
Caller: Maybe — can you email me?
Rep: I'll send a confirmation and reminder before your visit.`,
  actions: [
    { id: "act_1", type: "crm_follow_up", label: "CRM follow-up task", status: "succeeded", at: "2026-03-20T14:23:10Z" },
    { id: "act_2", type: "coaching", label: "Coaching task", status: "succeeded", at: "2026-03-20T14:23:11Z" },
  ],
};

// Fix typo in processedAt
CALL_DETAIL.processedAt = "2026-03-20T14:22:08Z";

export const WEBHOOK_SAMPLE = {
  externalMeetingId: "fathom_sim_abc123",
  source: "fathom_simulated",
  title: "Hygiene appointment booking",
  transcript:
    "Rep: Hi, thanks for calling Northstar. How can I help today?\nCaller: I'd like to book a cleaning next Tuesday morning.\nRep: Sure — Tuesday at 10:00 AM works. You're booked.",
  callType: "booking",
  occurredAt: "2026-03-19T16:40:00.000Z",
  businessId: "biz_demo_seed",
  representativeName: "Casey Ng",
  metadata: { channel: "phone", durationSec: 312 },
};

export const POLICY_SETTINGS = {
  highRiskKeywords: ["refund", "lawyer", "lawsuit", "HIPAA", "malpractice"],
  qaSampleRatePercent: 5,
  autoCreateCrmTasks: true,
  autoCreateCoachingTasks: true,
  autoQueueCustomerDrafts: true,
  neverSendCustomerMessages: true,
};
