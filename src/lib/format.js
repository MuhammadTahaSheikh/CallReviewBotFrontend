export function formatDate(iso) {
  if (!iso) return "—";
  // Fixed locale avoids SSR/client hydration mismatches.
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatMs(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function callTypeLabel(id) {
  const map = {
    sales: "Sales",
    support: "Support",
    booking: "Booking",
    consultation: "Consultation",
    internal: "Internal",
  };
  return map[id] || id;
}

export function scoreTone(score) {
  if (score == null) return "neutral";
  if (score >= 85) return "good";
  if (score >= 70) return "ok";
  if (score >= 50) return "warn";
  return "bad";
}
