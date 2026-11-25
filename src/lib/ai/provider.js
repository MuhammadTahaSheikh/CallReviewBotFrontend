import { analyzeWithXai } from "./xai-provider";
import { aiAnalysisSchema } from "../validation";
import { assertXaiConfigured } from "./xai-client";

/**
 * App runs live xAI only (no demo analysis path).
 */
export function getAiMode() {
  return "live";
}

/**
 * Evidence quotes must appear in the transcript; otherwise mark unverified by clearing quote.
 */
export function verifyEvidenceAgainstTranscript(analysis, transcript) {
  const haystack = transcript.toLowerCase();

  function checkQuote(quote) {
    if (!quote) return { quote: null, verified: false };
    const needle = quote.trim().toLowerCase();
    if (!needle) return { quote: null, verified: false };
    if (haystack.includes(needle)) return { quote, verified: true };
    const short = needle.slice(0, 40);
    if (short.length >= 12 && haystack.includes(short)) return { quote, verified: true };
    return { quote: `[unverified] ${quote}`, verified: false };
  }

  const categoryScores = analysis.categoryScores.map((cat) => {
    const { quote, verified } = checkQuote(cat.evidenceQuote);
    return { ...cat, evidenceQuote: quote, evidenceVerified: verified };
  });

  const mapFindings = (items) =>
    items.map((item) => {
      const { quote, verified } = checkQuote(item.evidence);
      return { ...item, evidence: quote, evidenceVerified: verified };
    });

  return {
    ...analysis,
    categoryScores,
    strengths: mapFindings(analysis.strengths),
    weaknesses: mapFindings(analysis.weaknesses),
  };
}

export async function runCallAnalysis(input) {
  assertXaiConfigured();
  const result = await analyzeWithXai(input);

  const parsed = aiAnalysisSchema.parse(result.analysis);
  const verified = verifyEvidenceAgainstTranscript(parsed, input.transcript);

  return {
    analysis: verified,
    meta: result.meta,
    mode: "live",
  };
}
