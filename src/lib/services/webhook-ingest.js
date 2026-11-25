import { prisma } from "../prisma";
import { webhookTranscriptSchema } from "../webhook-schema";
import { normalizeWebhookPayload } from "../webhook-normalize";
import { analyzeAndStoreCall } from "./analyze-call";

/**
 * Ingest an external automation payload through the same analysis pipeline.
 * Accepts canonical JSON or raw Fathom meeting payloads.
 * Deduplicates by source + externalMeetingId.
 */
export async function ingestWebhookTranscript(rawBody) {
  const normalized = normalizeWebhookPayload(rawBody);
  const payload = webhookTranscriptSchema.parse(normalized);

  const existing = await prisma.call.findUnique({
    where: {
      source_externalMeetingId: {
        source: payload.source,
        externalMeetingId: payload.externalMeetingId,
      },
    },
    select: {
      id: true,
      status: true,
      riskLevel: true,
      overallScore: true,
    },
  });

  if (existing) {
    await prisma.auditLog.create({
      data: {
        callId: existing.id,
        actor: "webhook",
        event: "webhook.duplicate_ignored",
        detail: JSON.stringify({
          source: payload.source,
          externalMeetingId: payload.externalMeetingId,
        }),
      },
    });

    return {
      callId: existing.id,
      status: existing.status,
      riskLevel: existing.riskLevel,
      overallScore: existing.overallScore,
      duplicate: true,
      message: "Duplicate delivery ignored — existing call returned",
    };
  }

  let businessName = "Northstar Clinic";
  if (payload.businessId) {
    const business = await prisma.business.findUnique({ where: { id: payload.businessId } });
    if (business) businessName = business.name;
  }

  const result = await analyzeAndStoreCall({
    title: payload.title,
    callType: payload.callType,
    transcript: payload.transcript,
    representativeName: payload.representativeName || "",
    businessName,
    occurredAt: payload.occurredAt,
    source: payload.source,
    externalMeetingId: payload.externalMeetingId,
    metadata: {
      ...(payload.metadata || {}),
      intake: "webhook",
      businessId: payload.businessId || null,
    },
  });

  return {
    ...result,
    duplicate: false,
    source: payload.source,
    externalMeetingId: payload.externalMeetingId,
  };
}
