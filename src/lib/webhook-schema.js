import { z } from "zod";
import { callTypeSchema } from "./validation";

/** Canonical webhook payload after n8n / Fathom normalization. */
export const webhookTranscriptSchema = z.object({
  externalMeetingId: z.string().trim().min(1).max(200),
  source: z.string().trim().min(1).max(80).default("fathom"),
  title: z.string().trim().min(2).max(200),
  transcript: z.string().trim().min(40).max(100_000),
  callType: callTypeSchema.default("sales"),
  occurredAt: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }),
  businessId: z.string().trim().max(80).optional().or(z.literal("")),
  representativeName: z.string().trim().max(120).optional().or(z.literal("")),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
