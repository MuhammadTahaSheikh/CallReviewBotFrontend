const TONES = {
  good: "badge-good",
  ok: "badge-ok",
  warn: "badge-warn",
  bad: "badge-bad",
  neutral: "badge-neutral",
  info: "badge-info",
};

export default function Badge({ children, tone = "neutral", className = "" }) {
  return <span className={`badge ${TONES[tone] || TONES.neutral} ${className}`}>{children}</span>;
}
