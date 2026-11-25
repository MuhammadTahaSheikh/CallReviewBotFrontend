const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SCORING_PROFILE_DEFINITIONS = [
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

async function main() {
  for (const profile of SCORING_PROFILE_DEFINITIONS) {
    await prisma.scoringProfile.upsert({
      where: { callType: profile.callType },
      update: {
        label: profile.label,
        description: profile.description,
        categories: JSON.stringify(profile.categories),
      },
      create: {
        callType: profile.callType,
        label: profile.label,
        description: profile.description,
        categories: JSON.stringify(profile.categories),
      },
    });
  }

  const business = await prisma.business.upsert({
    where: { id: "biz_demo_seed" },
    update: { name: "Northstar Clinic" },
    create: {
      id: "biz_demo_seed",
      name: "Northstar Clinic",
    },
  });

  const reps = [
    { id: "rep_jordan", name: "Jordan Lee" },
    { id: "rep_sam", name: "Sam Ortiz" },
    { id: "rep_casey", name: "Casey Ng" },
    { id: "rep_morgan", name: "Morgan Blake" },
  ];

  for (const rep of reps) {
    await prisma.representative.upsert({
      where: { id: rep.id },
      update: { name: rep.name, businessId: business.id },
      create: { id: rep.id, name: rep.name, businessId: business.id },
    });
  }

  const policy = {
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

  await prisma.appSetting.upsert({
    where: { key: "policy" },
    update: { value: JSON.stringify(policy) },
    create: { key: "policy", value: JSON.stringify(policy) },
  });

  console.log("Seed complete: scoring profiles, demo business, representatives, policy settings.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
