const INTENT_PATTERNS = [
  { intent: "greeting", patterns: [/\b(hi|hello|hey|good (morning|afternoon)|thanks for (calling|joining))\b/i] },
  { intent: "empathy", patterns: [/\b(i understand|i hear you|that sounds|must be (hard|frustrating)|appreciate how)\b/i] },
  { intent: "apology", patterns: [/\b(i('m| am) sorry|apologize|apology|regret)\b/i] },
  { intent: "discovery", patterns: [/\b(what|tell me|could you (explain|share|describe)|how (are|do|does)|what('s| is) (your|the) (challenge|goal|need))\b/i] },
  { intent: "problem_clarification", patterns: [/\b(when did|how long|can you walk me|what exactly|reproduce|error|issue)\b/i] },
  { intent: "pricing", patterns: [/\b(price|pricing|cost|budget|expensive|cheaper|discount|quote)\b/i] },
  { intent: "objection", patterns: [/\b(concern|hesitat|competitor|not sure|skeptic|however|but )\b/i] },
  { intent: "solution", patterns: [/\b(we can|here('s| is) what|fix|resolve|option|recommend|step)\b/i] },
  { intent: "confirmation", patterns: [/\b(confirm|booked|scheduled|tuesday|wednesday|monday|friday|at \d|you('re| are) set)\b/i] },
  { intent: "follow_up", patterns: [/\b(follow[- ]?up|i('ll| will) (send|email|call)|ticket|confirmation)\b/i] },
  { intent: "closing", patterns: [/\b(next step|shall we|book a|schedule a|demo|pilot|does .* work|move forward)\b/i] },
  { intent: "escalation", patterns: [/\b(supervisor|manager|escalate|legal|refund)\b/i] },
  { intent: "needs_assessment", patterns: [/\b(what (are you|do you) (hoping|looking)|priority|requirement|goal)\b/i] },
  { intent: "explanation", patterns: [/\b(our (service|platform|approach)|how it works|includes|onboarding)\b/i] },
  { intent: "recommendation", patterns: [/\b(i (would )?recommend|best (fit|path)|starter|pilot)\b/i] },
  { intent: "ownership", patterns: [/\b(i own|my responsibility|i missed|i should have)\b/i] },
  { intent: "status_update", patterns: [/\b(status|we('re| are) (on track|behind|green|at risk)|progress)\b/i] },
  { intent: "action_items", patterns: [/\b(action item|owner|due|by (monday|wednesday|friday|eod|end of day))\b/i] },
  { intent: "listen", patterns: [/\b(i hear|valid point|fair concern|you('re| are) right)\b/i] },
  { intent: "tradeoffs", patterns: [/\b(trade[- ]?off|priorit|capacity|split|sla)\b/i] },
  { intent: "decision", patterns: [/\b(let('s| us) (decide|align|document)|decision|agree)\b/i] },
  { intent: "requirements", patterns: [/\b(prefer|available|morning|afternoon|reschedule|appointment)\b/i] },
  { intent: "next_steps", patterns: [/\b(next step|reminder|send (you|the)|i('ll| will) note)\b/i] },
  { intent: "clarification", patterns: [/\b(just to clarify|so if i understand|do you mean|help me understand)\b/i] },
  { intent: "safe_next_step", patterns: [/\b(earliest|today|urgent|options? (are|we have)|safe)\b/i] },
  { intent: "expectation_setting", patterns: [/\b(realistic|timeline|one week|constraints?|scope)\b/i] },
  { intent: "agenda", patterns: [/\b(agenda|let('s| us) cover|status,? blockers)\b/i] },
  { intent: "risks", patterns: [/\b(risk|blocker|dependency|might slip)\b/i] },
  { intent: "root_cause", patterns: [/\b(root cause|because|capacity|dependency|prioritization)\b/i] },
  { intent: "recovery_plan", patterns: [/\b(recovery|revised plan|by wednesday|get back on track)\b/i] },
  { intent: "value_explanation", patterns: [/\b(value|roi|outcome|because we|difference is)\b/i] },
  { intent: "de_escalation", patterns: [/\b(let('s| us) (slow|solve)|i can help|options available)\b/i] },
];

export function detectIntent(message) {
  const text = String(message || "");
  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some((re) => re.test(text))) return entry.intent;
  }
  return "fallback";
}

export function mapIntentToRuleKey(intent, scenario) {
  const rules = scenario?.responseRules || {};
  if (rules[intent]) return intent;

  const aliases = {
    value_explanation: "explanation",
    de_escalation: "empathy",
    safe_next_step: "next_steps",
    expectation_setting: "recommendation",
    needs_assessment: "discovery",
    clarification: "problem_clarification",
    listen: "empathy",
    tradeoffs: "objection",
    decision: "closing",
    ownership: "apology",
    root_cause: "problem_clarification",
    recovery_plan: "solution",
    status_update: "explanation",
    risks: "objection",
    action_items: "follow_up",
    agenda: "greeting",
    requirements: "discovery",
    next_steps: "follow_up",
    recommendation: "closing",
  };

  const mapped = aliases[intent];
  if (mapped && rules[mapped]) return mapped;
  if (rules.fallback) return "fallback";
  return Object.keys(rules)[0] || "fallback";
}
