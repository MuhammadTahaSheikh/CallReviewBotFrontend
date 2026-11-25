const SENSITIVE_PATTERNS = [
  { id: "ssn", label: "possible SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/ },
  { id: "health", label: "possible health content", regex: /\b(diagnosis|medication|prescription|patient chart|hipaa|medical record)\b/i },
  { id: "card", label: "possible payment card", regex: /\b(?:\d[ -]*?){13,19}\b/ },
  { id: "routing", label: "possible bank routing", regex: /\brouting\s*(number|#)?\s*:?\s*\d{9}\b/i },
];

/**
 * Lightweight pre-screen before third-party model transmission.
 * Demo builds quarantine clearly; does not claim HIPAA compliance.
 */
export function precheckSensitiveContent(transcript) {
  const hits = SENSITIVE_PATTERNS.filter((p) => p.regex.test(transcript)).map((p) => p.label);
  return {
    blocked: hits.length > 0,
    reasons: hits,
  };
}
