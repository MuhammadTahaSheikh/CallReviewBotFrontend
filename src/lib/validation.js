import { z } from "zod";

export const callTypeSchema = z.enum(["sales", "support", "booking", "consultation", "internal"]);

export const analyzeCallSchema = z.object({
  title: z.string().trim().min(2).max(200),
  callType: callTypeSchema,
  transcript: z.string().trim().min(40).max(100_000),
  representativeName: z.string().trim().max(120).optional().or(z.literal("")),
  businessName: z.string().trim().max(160).optional().or(z.literal("")),
  occurredAt: z.string().datetime().optional(),
  source: z.string().trim().min(1).max(80).default("manual"),
  externalMeetingId: z.string().trim().min(1).max(200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const categoryScoreSchema = z.object({
  key: z.string(),
  label: z.string(),
  weight: z.number().int().min(0).max(100),
  score: z.number().min(0).max(100).nullable(),
  justification: z.string().optional().nullable(),
  evidenceQuote: z.string().optional().nullable(),
});

export const aiAnalysisSchema = z.object({
  summary: z.string().min(1),
  purpose: z.string().optional().nullable(),
  categoryScores: z.array(categoryScoreSchema).min(1),
  strengths: z.array(
    z.object({
      text: z.string(),
      evidence: z.string().optional().nullable(),
    })
  ),
  weaknesses: z.array(
    z.object({
      text: z.string(),
      evidence: z.string().optional().nullable(),
    })
  ),
  recommendations: z.array(z.string()),
  followUpOpportunities: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  proposedActions: z
    .array(
      z.object({
        type: z.enum(["crm_follow_up", "coaching", "customer_draft"]),
        label: z.string(),
        reason: z.string().optional(),
      })
    )
    .default([]),
});
