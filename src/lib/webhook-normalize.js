/**
 * Normalize inbound automation payloads into our webhook schema.
 * Supports:
 *  - Our canonical shape (already mapped by n8n)
 *  - Fathom "new meeting content ready" payloads (transcript as array)
 */

function formatFathomTranscript(transcript) {
  if (typeof transcript === "string") return transcript.trim();
  if (!Array.isArray(transcript)) return "";
  return transcript
    .map((item) => {
      const speaker = item?.speaker?.display_name || item?.speaker?.name || "Speaker";
      const text = String(item?.text || "").trim();
      if (!text) return null;
      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function looksLikeFathom(body) {
  if (!body || typeof body !== "object") return false;
  if (body.recording_id != null) return true;
  if (Array.isArray(body.transcript) && (body.title || body.meeting_title || body.url)) return true;
  return false;
}

function toIsoMaybe(value) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Infer a coarse callType from title/summary when n8n does not set one.
 */
function inferCallType(body) {
  const hay = `${body.title || ""} ${body.meeting_title || ""} ${body.default_summary?.markdown_formatted || ""}`.toLowerCase();
  if (/(support|ticket|issue|bug|outage)/.test(hay)) return "support";
  if (/(book|appoint|schedule|hygiene|consult slot)/.test(hay)) return "booking";
  if (/(consult|assessment|recommend)/.test(hay)) return "consultation";
  if (/(standup|retro|internal|1:1|one.on.one)/.test(hay)) return "internal";
  return "sales";
}

export function normalizeWebhookPayload(rawBody) {
  const body = rawBody && typeof rawBody === "object" ? rawBody : {};

  // Already canonical
  if (typeof body.transcript === "string" && body.externalMeetingId && body.title) {
    return {
      ...body,
      source: body.source || "fathom",
      callType: body.callType || "sales",
      occurredAt: toIsoMaybe(body.occurredAt) || body.occurredAt,
      representativeName: body.representativeName || "",
      businessId: body.businessId || "",
    };
  }

  if (looksLikeFathom(body)) {
    const transcript = formatFathomTranscript(body.transcript);
    const recordingId = body.recording_id ?? body.id ?? body.externalMeetingId;
    return {
      externalMeetingId: String(recordingId),
      source: body.source || "fathom",
      title: String(body.title || body.meeting_title || `Fathom recording ${recordingId}`).slice(0, 200),
      transcript,
      callType: body.callType || inferCallType(body),
      occurredAt: toIsoMaybe(body.recording_start_time || body.created_at || body.occurredAt),
      businessId: body.businessId || "",
      representativeName: body.representativeName || body.recorded_by?.name || "",
      metadata: {
        ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
        provider: "fathom",
        recordingId,
        url: body.url || null,
        shareUrl: body.share_url || null,
        recordedByEmail: body.recorded_by?.email || null,
        inviteeCount: Array.isArray(body.calendar_invitees) ? body.calendar_invitees.length : null,
      },
    };
  }

  return body;
}
