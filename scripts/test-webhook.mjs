/**
 * Local Node.js test for POST /api/webhooks/transcripts
 *
 * Usage:
 *   node scripts/test-webhook.mjs
 *   node scripts/test-webhook.mjs --duplicate
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE_URL || "http://localhost:3000";
const secret = process.env.WEBHOOK_SECRET || "change-me-local-secret";
const sendDuplicate = process.argv.includes("--duplicate");

const payload = JSON.parse(
  readFileSync(join(__dirname, "..", "samples", "webhook-transcript.json"), "utf8")
);

// Unique id each run unless testing duplicate
if (!sendDuplicate) {
  payload.externalMeetingId = `fathom_sim_${Date.now()}`;
}

async function postOnce(label) {
  const res = await fetch(`${base}/api/webhooks/transcripts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WEBHOOK-SECRET": secret,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  console.log(`\n[${label}] HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));
  return { res, body };
}

console.log("Webhook test →", `${base}/api/webhooks/transcripts`);
console.log("externalMeetingId:", payload.externalMeetingId);

const first = await postOnce("first delivery");
if (!first.res.ok && first.res.status !== 200) process.exit(1);

const second = await postOnce("second delivery (expect duplicate)");
if (!second.body.duplicate && second.res.status !== 409) {
  console.error("Expected duplicate handling on second delivery");
  process.exit(1);
}

console.log("\nOK — webhook ingest + dedupe verified.");
