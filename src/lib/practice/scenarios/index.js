/**
 * Modular practice scenario catalog.
 * Reuses existing callType keys from scoring profiles.
 */

function scenario(def) {
  return def;
}

export const PRACTICE_SCENARIOS = [
  // —— Sales ——
  scenario({
    id: "sales_info_request",
    callType: "sales",
    name: "Interested customer requesting information",
    description: "A warm lead wants to understand your offering before committing time.",
    participantName: "Alex Rivera",
    participantRole: "Potential customer",
    personality: "Curious, polite, time-conscious",
    objective: "Learn enough to decide whether to book a deeper demo.",
    openingMessage:
      "Hi — I saw your CRM automation page. Can you tell me what you actually help with day to day?",
    difficultyDefaults: ["beginner", "intermediate"],
    expectedBehaviors: ["greeting", "discovery", "value_explanation", "next_step"],
    completionConditions: ["asked_discovery", "explained_value", "proposed_next_step"],
    responseRules: {
      greeting: [
        "Thanks for asking. We're looking for a simpler way to manage follow-ups.",
        "Appreciate the welcome — I've only got a few minutes.",
      ],
      discovery: [
        "We get a lot of leads, but our team struggles to follow up consistently.",
        "Most of our time goes into manual reminders and lost notes between agents.",
      ],
      pricing: [
        "Pricing matters, but I first need to know if this fits our workflow.",
        "I'd rather understand the value before we talk numbers.",
      ],
      objection: [
        "I'm interested, but I need something practical — not another flashy dashboard.",
        "We've tried tools before that looked good and then nobody used them.",
      ],
      closing: [
        "A short demo next week could work if you can show the follow-up piece.",
        "If you send a one-pager and a booking link, I'll review it with my manager.",
      ],
      fallback: [
        "Could you clarify how that helps our follow-up process specifically?",
        "I'm not sure I follow — what would change for my team this month?",
      ],
    },
  }),
  scenario({
    id: "sales_pricing_objection",
    callType: "sales",
    name: "Customer with pricing objections",
    description: "Prospect likes the idea but pushes hard on cost vs a cheaper competitor.",
    participantName: "Sarah Mitchell",
    participantRole: "Potential customer",
    personality: "Direct, budget-focused, comparative",
    objective: "Negotiate value without dismissing budget concerns; establish a next step.",
    openingMessage:
      "I am interested in your services, but your pricing seems expensive compared to another quote we received.",
    difficultyDefaults: ["intermediate", "advanced"],
    expectedBehaviors: ["empathy", "discovery", "objection_handling", "value_explanation", "closing"],
    completionConditions: ["acknowledged_price", "explored_needs", "differentiated_value", "clear_next_step"],
    responseRules: {
      greeting: ["Let's get straight to it — price is my main concern."],
      discovery: [
        "We receive a lot of leads, but our team struggles to follow up with them consistently.",
        "The cheaper option covers basic CRM notes, but follow-up automation looks weak.",
      ],
      pricing: [
        "The other provider is about 30% cheaper for a similar-looking package.",
        "I need to justify any premium to my owner — what do we get that they don't?",
      ],
      objection: [
        "If the price is higher, I need a concrete reason — not just 'better quality.'",
        "I'm still leaning toward the cheaper option unless you can show clear ROI.",
      ],
      empathy: [
        "Thanks for saying that — budget pressure is real for us right now.",
        "I appreciate you acknowledging the cost concern.",
      ],
      closing: [
        "If you can send a side-by-side comparison, I'll take it to my owner tomorrow.",
        "A 20-minute walkthrough focused on follow-up automation would help me decide.",
      ],
      fallback: [
        "That still doesn't address why I should pay more. Can you be more specific?",
        "I'm stuck on price — help me understand the difference in outcomes.",
      ],
    },
  }),
  scenario({
    id: "sales_skeptical_competitor",
    callType: "sales",
    name: "Skeptical customer comparing competitors",
    description: "A skeptical buyer has been burned before and challenges every claim.",
    participantName: "Jordan Blake",
    participantRole: "Potential customer",
    personality: "Skeptical, analytical, slow to trust",
    objective: "Earn credibility with evidence and a low-risk next step.",
    openingMessage:
      "We've looked at two competitors already. Convince me you're not just another sales pitch.",
    difficultyDefaults: ["advanced"],
    expectedBehaviors: ["discovery", "objection_handling", "evidence", "closing"],
    completionConditions: ["handled_skepticism", "asked_discovery", "offered_proof", "next_step"],
    responseRules: {
      greeting: ["Skip the small talk — I've heard the usual claims."],
      discovery: [
        "Our last tool promised automation and still left reps chasing spreadsheets.",
        "I care about adoption, reporting accuracy, and whether managers can coach from the data.",
      ],
      objection: [
        "Everyone says they're different. What proof do you have from a similar business?",
        "If this fails, I lose credibility internally — so I'm cautious.",
      ],
      pricing: ["Price is secondary to whether this actually gets used."],
      closing: [
        "A reference call with a similar team would move this forward.",
        "Send a short case study and I'll decide if a pilot is worth it.",
      ],
      fallback: ["That sounded vague. Can you give a concrete example?"],
    },
  }),

  // —— Support ——
  scenario({
    id: "support_technical_issue",
    callType: "support",
    name: "Customer experiencing a technical issue",
    description: "Customer cannot complete a key workflow and needs calm troubleshooting.",
    participantName: "Sam Patel",
    participantRole: "Customer with a problem",
    personality: "Frustrated but cooperative if guided",
    objective: "Get the booking confirmation email working again today.",
    openingMessage:
      "Hi — my booking confirmation emails stopped sending yesterday and clients are calling me confused.",
    difficultyDefaults: ["beginner", "intermediate"],
    expectedBehaviors: ["greeting", "empathy", "problem_clarification", "solution", "follow_up"],
    completionConditions: ["clarified_issue", "offered_steps", "confirmed_follow_up"],
    responseRules: {
      greeting: ["Thanks for picking up — this is blocking my day."],
      empathy: ["I appreciate that. I just need this fixed."],
      problem_clarification: [
        "It started after we changed our reminder template yesterday afternoon.",
        "SMS reminders still go out, but email confirmations don't.",
      ],
      solution: [
        "Okay, I can try that. Should I wait while you check something on your side?",
        "If I rebuild the template, will old bookings still get emails?",
      ],
      follow_up: ["A ticket number and ETA would help me update my front desk."],
      escalation: ["If this can't be fixed today, I need a supervisor."],
      fallback: ["Can you walk me through the next step more slowly?"],
    },
  }),
  scenario({
    id: "support_angry_refund",
    callType: "support",
    name: "Angry customer requesting a refund",
    description: "Upset customer demands a refund and may escalate.",
    participantName: "Morgan Ellis",
    participantRole: "Angry customer",
    personality: "Angry, impatient, risk of escalation",
    objective: "Secure a refund or clear path — feels overcharged.",
    openingMessage:
      "This is unacceptable. I want a full refund right now or I will escalate this further.",
    difficultyDefaults: ["advanced"],
    expectedBehaviors: ["empathy", "apology", "problem_clarification", "de_escalation", "next_step"],
    completionConditions: ["acknowledged_emotion", "clarified_facts", "explained_options", "next_step"],
    responseRules: {
      greeting: ["Don't waste my time with a script."],
      empathy: ["Fine — at least you're listening."],
      apology: ["An apology only helps if you fix the charge."],
      problem_clarification: [
        "I was billed twice for the same package on March 12.",
        "I already emailed twice and got no useful reply.",
      ],
      solution: [
        "If you can reverse the duplicate charge today, I'll calm down.",
        "I need written confirmation of the refund timeline.",
      ],
      escalation: ["If you can't help, get me someone who can. I may involve legal help."],
      fallback: ["You're not answering me. Will I get the refund or not?"],
    },
  }),
  scenario({
    id: "support_poor_service",
    callType: "support",
    name: "Customer complaining about poor service",
    description: "Customer felt ignored and wants accountability plus improvement.",
    participantName: "Casey Nguyen",
    participantRole: "Dissatisfied customer",
    personality: "Disappointed, firm, wants acknowledgment",
    objective: "Feel heard and get a concrete recovery plan.",
    openingMessage:
      "I waited 40 minutes on hold last week and then nobody followed up like they promised.",
    difficultyDefaults: ["intermediate"],
    expectedBehaviors: ["apology", "empathy", "problem_clarification", "solution", "follow_up"],
    completionConditions: ["apologized", "owned_issue", "recovery_plan"],
    responseRules: {
      apology: ["Thank you — I needed to hear that."],
      empathy: ["Exactly. It made us look unprofessional to our clients."],
      problem_clarification: [
        "The agent said someone would call Thursday. Nobody did.",
        "I have the ticket number if you need it: SUP-44129.",
      ],
      solution: ["A callback window today and a courtesy credit would help."],
      follow_up: ["Please email me the plan so I have it in writing."],
      fallback: ["What are you going to do differently this time?"],
    },
  }),

  // —— Booking ——
  scenario({
    id: "booking_new_appointment",
    callType: "booking",
    name: "Customer requesting a new appointment",
    description: "Straightforward scheduling request with preference constraints.",
    participantName: "Taylor Brooks",
    participantRole: "Person requesting an appointment",
    personality: "Friendly, slightly unsure about times",
    objective: "Book a cleaning appointment next week.",
    openingMessage: "Hi, I'd like to book a cleaning appointment sometime next week if possible.",
    difficultyDefaults: ["beginner"],
    expectedBehaviors: ["greeting", "requirements", "confirmation", "next_steps"],
    completionConditions: ["captured_preferences", "offered_slot", "confirmed_details"],
    responseRules: {
      greeting: ["Thanks! Mornings are easier for me."],
      requirements: [
        "Preferably Tuesday or Wednesday before noon.",
        "It's for me — adult cleaning, no special medical notes for this practice exercise.",
      ],
      confirmation: ["Tuesday at 10 works. Can you repeat the address and what I should bring?"],
      next_steps: ["A text reminder the day before would be perfect."],
      fallback: ["Sorry — what times do you still have open?"],
    },
  }),
  scenario({
    id: "booking_reschedule",
    callType: "booking",
    name: "Customer requesting appointment rescheduling",
    description: "Existing appointment conflict; needs a clean reschedule.",
    participantName: "Riley Quinn",
    participantRole: "Person rescheduling",
    personality: "Apologetic but urgent",
    objective: "Move Thursday 2pm appointment without losing the slot chain.",
    openingMessage:
      "I need to reschedule my Thursday 2 PM appointment — something came up at work.",
    difficultyDefaults: ["beginner", "intermediate"],
    expectedBehaviors: ["empathy", "requirements", "confirmation", "next_steps"],
    completionConditions: ["identified_old_slot", "offered_new_slot", "confirmed"],
    responseRules: {
      empathy: ["Thanks for understanding."],
      requirements: [
        "Friday afternoon or Monday morning would be better.",
        "Same service — just a different day.",
      ],
      confirmation: ["Monday at 9:30 is great. Please cancel Thursday so I don't get a reminder."],
      next_steps: ["Please send the updated confirmation to this number."],
      fallback: ["Which alternative times do you have left?"],
    },
  }),
  scenario({
    id: "booking_urgent_high_risk",
    callType: "booking",
    name: "Customer with an urgent or potentially high-risk request",
    description: "Urgent booking request with pressure and incomplete information.",
    participantName: "Avery Stone",
    participantRole: "Urgent requester",
    personality: "Anxious, pushes for same-day, incomplete details",
    objective: "Get seen today somehow.",
    openingMessage:
      "I need an appointment today — it's urgent. Can you just squeeze me in somehow?",
    difficultyDefaults: ["advanced"],
    expectedBehaviors: ["empathy", "requirements", "clarification", "safe_next_step"],
    completionConditions: ["assessed_urgency", "gathered_info", "offered_safe_options"],
    responseRules: {
      empathy: ["I'm really stressed and don't want to wait days."],
      requirements: [
        "Anytime after 3 PM today would help.",
        "I can come in person, but I don't have all my details handy.",
      ],
      clarification: [
        "It's uncomfortable but not an emergency room situation — I still want today if possible.",
        "If today is impossible, what's the earliest tomorrow?",
      ],
      objection: ["I don't want a long questionnaire — just get me on the schedule."],
      next_steps: ["Okay — hold a tentative slot and tell me exactly what info you still need."],
      fallback: ["So is there any chance today, yes or no?"],
    },
  }),

  // —— Consultation ——
  scenario({
    id: "consult_explore_services",
    callType: "consultation",
    name: "Client exploring available services",
    description: "Early-stage client exploring options without a clear package preference.",
    participantName: "Harper Lee",
    participantRole: "Client seeking guidance",
    personality: "Open, reflective, undecided",
    objective: "Understand options and leave with a recommended starting path.",
    openingMessage:
      "I'm exploring what you offer. I'm not sure which service fits us yet.",
    difficultyDefaults: ["beginner"],
    expectedBehaviors: ["needs_assessment", "explanation", "recommendation", "follow_up"],
    completionConditions: ["assessed_needs", "explained_options", "recommended_path"],
    responseRules: {
      needs_assessment: [
        "We mainly need clearer reporting and less manual follow-up.",
        "We're a small team — five people — and nobody owns process right now.",
      ],
      explanation: ["That helps. How long does onboarding usually take for a team our size?"],
      recommendation: ["A starter package with coaching sounds more realistic than enterprise."],
      follow_up: ["Could you email a simple comparison of the two paths we discussed?"],
      fallback: ["What would you recommend as a first step for us?"],
    },
  }),
  scenario({
    id: "consult_unclear_requirements",
    callType: "consultation",
    name: "Client with unclear requirements",
    description: "Client knows they have a problem but can't articulate requirements.",
    participantName: "Drew Coleman",
    participantRole: "Client with unclear needs",
    personality: "Vague, jumps topics, needs structure",
    objective: "Leave with a clearer problem statement and proposed discovery next step.",
    openingMessage:
      "Things are kind of messy on our side. We just need help… making stuff work better.",
    difficultyDefaults: ["intermediate"],
    expectedBehaviors: ["needs_assessment", "clarification", "recommendation"],
    completionConditions: ["narrowed_problem", "confirmed_understanding", "next_step"],
    responseRules: {
      needs_assessment: [
        "I guess lead response time is bad, and reporting is confusing.",
        "Also onboarding new hires takes forever — maybe that's related?",
      ],
      clarification: [
        "If I had to pick one pain: follow-up consistency.",
        "You're right — I'm mixing several problems together.",
      ],
      recommendation: ["A discovery workshop first makes sense before buying a big package."],
      fallback: ["I'm not sure how to answer that — can you ask it another way?"],
    },
  }),
  scenario({
    id: "consult_unrealistic_expectations",
    callType: "consultation",
    name: "Client with unrealistic expectations",
    description: "Client expects overnight transformation with minimal effort.",
    participantName: "Cameron Walsh",
    participantRole: "Client with high expectations",
    personality: "Optimistic to a fault, resists constraints",
    objective: "Want results in one week with almost no team involvement.",
    openingMessage:
      "We need this fully transformed in a week, and my team barely has time to meet.",
    difficultyDefaults: ["advanced"],
    expectedBehaviors: ["needs_assessment", "expectation_setting", "recommendation", "closing"],
    completionConditions: ["reset_timeline", "defined_scope", "agreed_pilot"],
    responseRules: {
      needs_assessment: ["We want automation, training, and reporting — all ASAP."],
      objection: [
        "A month feels too slow. Leadership already announced a one-week turnaround.",
        "Can't you just set it up for us without workshops?",
      ],
      recommendation: [
        "A one-week pilot on follow-ups only might be realistic — not a full transformation.",
        "If leadership needs a win fast, we should pick one measurable metric.",
      ],
      closing: ["Okay — propose a one-week pilot scope and I'll take it upstairs."],
      fallback: ["That still sounds slower than what I promised internally."],
    },
  }),

  // —— Internal ——
  scenario({
    id: "internal_progress_discussion",
    callType: "internal",
    name: "Project progress discussion",
    description: "Stakeholder wants a clear status and risks.",
    participantName: "Manager Priya Shah",
    participantRole: "Manager / stakeholder",
    personality: "Structured, concise, outcome-focused",
    objective: "Leave with status, risks, and owners.",
    openingMessage:
      "Quick sync — where are we on the rollout, and what might slip this week?",
    difficultyDefaults: ["beginner", "intermediate"],
    expectedBehaviors: ["agenda", "status_update", "risks", "action_items"],
    completionConditions: ["gave_status", "named_risks", "assigned_owners"],
    responseRules: {
      agenda: ["Good — keep it tight. Status, blockers, asks."],
      status_update: ["Thanks. Which items are green vs at risk?"],
      risks: ["Who owns the integration blocker, and what's the new date?"],
      action_items: ["Capture owners and due dates in writing after this call."],
      fallback: ["Can you give me the headline in one sentence?"],
    },
  }),
  scenario({
    id: "internal_missed_deadline",
    callType: "internal",
    name: "Missed deadline and accountability discussion",
    description: "Manager addresses a missed deadline constructively but firmly.",
    participantName: "Director Chris Ortega",
    participantRole: "Manager",
    personality: "Firm, fair, expects ownership",
    objective: "Understand cause and lock a recovery plan.",
    openingMessage:
      "The Friday deliverable didn't land. I need a clear explanation and a recovery plan today.",
    difficultyDefaults: ["intermediate", "advanced"],
    expectedBehaviors: ["ownership", "root_cause", "recovery_plan", "action_items"],
    completionConditions: ["owned_miss", "explained_cause", "recovery_with_dates"],
    responseRules: {
      ownership: ["I needed to hear ownership — thank you."],
      root_cause: ["Was this capacity, dependency, or prioritization?"],
      recovery_plan: ["What ships by Wednesday, and what moves out?"],
      action_items: ["Send me the revised plan with owners before end of day."],
      fallback: ["I still don't have a date. When is it done?"],
    },
  }),
  scenario({
    id: "internal_priority_disagreement",
    callType: "internal",
    name: "Disagreement about project priorities",
    description: "Colleague disagrees on what should be prioritized next.",
    participantName: "Colleague Nina Park",
    participantRole: "Colleague / stakeholder",
    personality: "Passionate, opinionated, collaborative if heard",
    objective: "Win support for redesign work over bug burn-down.",
    openingMessage:
      "I disagree with prioritizing the redesign this sprint — we should burn down the bug backlog first.",
    difficultyDefaults: ["advanced"],
    expectedBehaviors: ["listen", "clarify", "tradeoffs", "decision"],
    completionConditions: ["acknowledged_view", "shared_criteria", "agreed_decision_or_escalation"],
    responseRules: {
      listen: ["Thanks for hearing me out — bugs are hurting trust."],
      clarify: [
        "My concern is customer-reported defects in onboarding.",
        "If redesign slips two weeks, what breaks commercially?",
      ],
      tradeoffs: [
        "I'd accept a thinner redesign if we protect a bug SLA.",
        "Maybe we split capacity 70/30 — can we decide that now?",
      ],
      decision: ["Okay — let's document the decision and who we need to align with."],
      fallback: ["You're not addressing the customer impact of the bugs."],
    },
  }),
];

export function listScenarios({ callType } = {}) {
  if (!callType || callType === "all") return PRACTICE_SCENARIOS;
  return PRACTICE_SCENARIOS.filter((s) => s.callType === callType);
}

export function getScenarioById(id) {
  return PRACTICE_SCENARIOS.find((s) => s.id === id) || null;
}

export function getPublicScenario(scenario) {
  if (!scenario) return null;
  const {
    responseRules,
    completionConditions,
    expectedBehaviors,
    ...publicFields
  } = scenario;
  return {
    ...publicFields,
    // Keep high-level expectations without revealing full rule trees
    expectedBehaviors,
  };
}
