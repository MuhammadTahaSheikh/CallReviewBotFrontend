/**
 * Shared xAI Chat Completions client (no silent demo fallback).
 */

export function getXaiConfig() {
  const apiKey = process.env.XAI_API_KEY || "";
  const baseUrl = (process.env.XAI_BASE_URL || "https://api.x.ai/v1").replace(/\/$/, "");
  const model = process.env.XAI_MODEL || "grok-4.6";
  return { apiKey, baseUrl, model };
}

export function assertXaiConfigured() {
  const { apiKey } = getXaiConfig();
  if (!apiKey) {
    throw new Error("XAI_API_KEY is required. Add it to .env and restart the server.");
  }
}

/**
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   temperature?: number,
 *   json?: boolean,
 *   maxTokens?: number,
 * }} opts
 */
export async function xaiChatCompletions({
  messages,
  temperature = 0.7,
  json = false,
  maxTokens = 800,
}) {
  assertXaiConfigured();
  const { apiKey, baseUrl, model } = getXaiConfig();

  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages,
  };
  if (json) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`xAI request failed (${response.status}): ${errText.slice(0, 400)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    throw new Error("xAI returned an empty response");
  }

  return {
    content: String(content).trim(),
    model,
    usage: payload.usage || {},
    raw: payload,
  };
}
