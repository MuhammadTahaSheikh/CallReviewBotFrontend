const base = process.env.BASE_URL || "http://localhost:3000";

async function postCall(payload) {
  const res = await fetch(`${base}/api/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data));
  return data;
}

const low = await postCall({
  title: "Phase4 low-risk booking",
  callType: "booking",
  representativeName: "Casey Ng",
  transcript: `Rep: Thanks for calling, how can I help?
Caller: I'd like to book a cleaning next Tuesday.
Rep: Tuesday at 10 works. I'll send a confirmation.
Caller: Perfect, thank you.`,
});
console.log("LOW", { status: low.status, risk: low.riskLevel, routing: low.routing });

const high = await postCall({
  title: "Phase4 high-risk refund",
  callType: "support",
  representativeName: "Sam Ortiz",
  transcript: `Rep: Support, how can I help?
Caller: I want a full refund right now or I will call my lawyer.
Rep: I understand. I can open a review ticket.
Caller: That is unacceptable.`,
});
console.log("HIGH", {
  status: high.status,
  risk: high.riskLevel,
  routing: high.routing,
  reasons: high.routingReasons,
});

const ex = await fetch(`${base}/api/exceptions`).then((r) => r.json());
const match = (ex.items || []).find((i) => i.callId === high.callId);
console.log("EXCEPTION_PRESENT", Boolean(match), match?.reason);

if (match) {
  const approve = await fetch(`${base}/api/exceptions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: match.id, status: "approved", notes: "Phase4 smoke approve" }),
  }).then((r) => r.json());
  console.log("APPROVED", approve.item?.status);
}

const policySave = await fetch(`${base}/api/profiles`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ queueMediumRisk: true, qaSampleRatePercent: 5 }),
}).then(async (r) => ({ status: r.status, body: await r.json() }));
console.log("POLICY_SAVE", policySave.status, policySave.body.policy?.queueMediumRisk);
