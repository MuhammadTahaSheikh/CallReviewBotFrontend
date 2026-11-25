import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateWebhook, rateLimitWebhook } from "../../../../lib/webhook-auth";
import { ingestWebhookTranscript } from "../../../../lib/services/webhook-ingest";

export async function POST(request) {
  const auth = authenticateWebhook(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
  }

  const limited = rateLimitWebhook(request);
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error, code: limited.code }, { status: limited.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  try {
    const result = await ingestWebhookTranscript(body);
    const statusCode = result.duplicate ? 200 : 201;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.issues || error.errors,
        },
        { status: 400 }
      );
    }

    // Unique constraint race on duplicate
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error: "Duplicate delivery",
          code: "DUPLICATE",
          message: "A call with this source + externalMeetingId already exists",
        },
        { status: 409 }
      );
    }

    console.error("POST /api/webhooks/transcripts", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed", code: "PROCESSING_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/webhooks/transcripts",
    auth: "Header X-WEBHOOK-SECRET",
    accepts: [
      "Canonical JSON (externalMeetingId, source, title, transcript, ...)",
      "Fathom meeting webhook payload (recording_id + transcript[])",
    ],
    n8nWorkflow: "n8n/fathom-to-call-review-bot.json",
    note: "n8n receives Fathom → normalizes → POSTs here. App runs the same analyze + policy pipeline as manual Analyze Call.",
  });
}
