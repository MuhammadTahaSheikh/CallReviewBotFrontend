/**
 * Local smoke test for demo analyze pipeline via HTTP.
 * Usage: node scripts/smoke-analyze.mjs
 */
const base = process.env.BASE_URL || "http://localhost:3000";

const payload = {
  title: "Smoke test — orthodontics inquiry",
  callType: "sales",
  representativeName: "Jordan Lee",
  businessName: "Northstar Clinic",
  transcript: `Rep: Thanks for calling Northstar. How can I help today?
Caller: Hi, I'm interested in braces for myself. I'm 32.
Rep: Absolutely. What concerns you most about your smile right now?
Caller: Mostly crowding in the front, and cost.
Rep: Cost is a fair concern — we do offer payment plans. I'll keep this simple and walk through the options with you.
Caller: Okay.
Rep: Would Thursday afternoon work for a consult?
Caller: Maybe — can you email me?
Rep: I'll send a confirmation and reminder before your visit.`,
};

const createRes = await fetch(`${base}/api/calls`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const created = await createRes.json();
console.log("POST /api/calls", createRes.status, created);

if (!createRes.ok) process.exit(1);

const detailRes = await fetch(`${base}/api/calls/${created.callId}`);
const detail = await detailRes.json();
console.log("GET call score", detail.call?.overallScore, "status", detail.call?.status, "demo", detail.call?.analysis?.demoMode);

const overviewRes = await fetch(`${base}/api/overview`);
const overview = await overviewRes.json();
console.log("Overview totals", overview.stats);
