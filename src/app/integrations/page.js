import PageHeader from "../../components/ui/PageHeader";

const WEBHOOK_SAMPLE = {
  externalMeetingId: "123456789",
  source: "fathom",
  title: "Discovery call with Acme",
  transcript:
    "Alex Rivera: Hi — thanks for joining.\nCasey Ng: Of course. What are you hoping to solve?\nAlex Rivera: Follow-ups keep falling through the cracks...",
  callType: "sales",
  occurredAt: "2026-03-19T16:40:00.000Z",
  representativeName: "Casey Ng",
  metadata: { provider: "fathom", via: "n8n" },
};

const CURL_EXAMPLE = `curl -X POST http://localhost:3000/api/webhooks/transcripts \\
  -H "Content-Type: application/json" \\
  -H "X-WEBHOOK-SECRET: $WEBHOOK_SECRET" \\
  -d @samples/webhook-transcript.json`;

const ENDPOINT_CONTRACT = `POST /api/webhooks/transcripts
Headers:
  Content-Type: application/json
  X-WEBHOOK-SECRET: <same value as WEBHOOK_SECRET in .env>

Accepts:
  1) Canonical JSON (below)
  2) Raw Fathom meeting webhook (recording_id + transcript[])

Success (201):
  { "callId": "...", "status": "completed|exception|quarantined", "duplicate": false, ... }

Duplicate (200):
  { "callId": "...", "duplicate": true, "message": "Duplicate delivery ignored..." }`;

const N8N_STEPS = `1. Import n8n/fathom-to-call-review-bot.json into n8n
2. Copy the Webhook node's Production URL
3. In Fathom → Webhooks: destination = that URL, include_transcript = true
4. Set n8n env:
     CALL_REVIEW_BOT_URL=https://<your-public-app-host>
     CALL_REVIEW_WEBHOOK_SECRET=<same as app WEBHOOK_SECRET>
5. Activate the workflow
6. New Fathom meetings → appear in Call History after xAI analysis`;

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Fathom (via n8n) posts transcripts into the same analyze + policy pipeline as manual Analyze Call."
      />

      <div className="stack">
        <section className="panel panel-pad">
          <h2 className="panel-title">Connection status</h2>
          <ul className="list-plain">
            <li>Webhook receiver: POST /api/webhooks/transcripts</li>
            <li>Auth: X-WEBHOOK-SECRET (not Supabase login)</li>
            <li>Dedupe: source + externalMeetingId</li>
            <li>n8n workflow file: n8n/fathom-to-call-review-bot.json</li>
            <li>Fathom raw payloads: accepted (normalized in-app)</li>
          </ul>
        </section>

        <section className="panel panel-pad">
          <h2 className="panel-title">n8n setup</h2>
          <p className="panel-sub">Recommended path: Fathom → n8n → this app</p>
          <pre className="code-block">{N8N_STEPS}</pre>
        </section>

        <section className="panel panel-pad">
          <h2 className="panel-title">Webhook endpoint</h2>
          <pre className="code-block">{ENDPOINT_CONTRACT}</pre>
        </section>

        <section className="panel panel-pad">
          <h2 className="panel-title">Canonical payload sample</h2>
          <pre className="code-block">{JSON.stringify(WEBHOOK_SAMPLE, null, 2)}</pre>
        </section>

        <section className="panel panel-pad">
          <h2 className="panel-title">Local curl</h2>
          <pre className="code-block">{CURL_EXAMPLE}</pre>
        </section>

        <section className="panel panel-pad">
          <h2 className="panel-title">Local Node test</h2>
          <pre className="code-block">{"npm run test:webhook"}</pre>
        </section>
      </div>
    </div>
  );
}
