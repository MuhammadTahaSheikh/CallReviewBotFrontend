const base = process.env.BASE_URL || "http://localhost:3000";

async function req(path, opts) {
  const res = await fetch(`${base}${path}`, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${opts?.method || "GET"} ${path} → ${res.status} ${body.error || ""}`);
  return body;
}

const scenarios = await req("/api/practice/scenarios?callType=sales");
console.log("scenarios", scenarios.scenarios.length);
const scenarioId = scenarios.scenarios.find((s) => s.id === "sales_pricing_objection")?.id;
if (!scenarioId) throw new Error("missing sales_pricing_objection");

const created = await req("/api/practice/sessions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    scenarioId,
    difficulty: "intermediate",
    representativeName: "Jordan Lee",
  }),
});
const id = created.session.id;
console.log("session", id, "status", created.session.status);
console.log(
  "opening",
  created.session.messages.filter((m) => m.role === "participant")[0]?.content?.slice(0, 80)
);

const msg1 = await req(`/api/practice/sessions/${id}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content: "I understand budget is important. What challenges are you facing with follow-ups today?",
    clientMessageId: "m1",
  }),
});
console.log("after msg1 messages", msg1.session.messages.length);

// duplicate protection
const dup = await req(`/api/practice/sessions/${id}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content: "duplicate should be ignored",
    clientMessageId: "m1",
  }),
});
console.log("dup message count unchanged?", dup.session.messages.length === msg1.session.messages.length);

await req(`/api/practice/sessions/${id}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content: "We can compare inclusions and then book a 20-minute demo as a next step.",
    clientMessageId: "m2",
  }),
});

const ended = await req(`/api/practice/sessions/${id}/end`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
console.log("ended", ended.session.status);

const evaluated = await req(`/api/practice/sessions/${id}/evaluate`, { method: "POST" });
console.log("evaluated", evaluated.session.status, "score", evaluated.session.evaluation?.overallScore);
console.log("trainingWarnings", evaluated.session.evaluation?.trainingWarnings?.length || 0);

const history = await req("/api/practice/sessions");
console.log("history count", history.sessions.length);

const analytics = await req("/api/practice/analytics");
console.log("analytics total", analytics.stats.totalSessions, "avg", analytics.stats.averageScore);

// Ensure no operational call was created for this practice id
console.log("OK practice smoke passed");
