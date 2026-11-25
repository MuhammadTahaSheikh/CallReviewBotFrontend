import { timingSafeEqual } from "crypto";

const hits = new Map();

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Authenticate webhook requests with shared secret header X-WEBHOOK-SECRET.
 */
export function authenticateWebhook(request) {
  const expected = process.env.WEBHOOK_SECRET || "";
  if (!expected || expected === "change-me-local-secret") {
    // Still allow local demo with the example secret, but require header match
  }
  if (!expected) {
    return { ok: false, status: 500, code: "WEBHOOK_MISCONFIGURED", error: "WEBHOOK_SECRET is not configured" };
  }

  const provided = request.headers.get("x-webhook-secret") || "";
  if (!provided || !safeEqual(provided, expected)) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", error: "Invalid or missing X-WEBHOOK-SECRET" };
  }

  return { ok: true };
}

/**
 * Simple in-memory rate limit for local prototype (per client IP).
 * Not for production scale.
 */
export function rateLimitWebhook(request, { limit = 30, windowMs = 60_000 } = {}) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const now = Date.now();
  const bucket = hits.get(ip) || [];
  const recent = bucket.filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    return {
      ok: false,
      status: 429,
      code: "RATE_LIMITED",
      error: `Too many webhook requests. Limit ${limit} per ${Math.round(windowMs / 1000)}s.`,
    };
  }
  recent.push(now);
  hits.set(ip, recent);
  return { ok: true };
}
