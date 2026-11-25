#!/usr/bin/env bash
# Example curl for local webhook intake (Phase 5)
# Usage: bash scripts/curl-webhook.example.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-change-me-local-secret}"

curl -sS -X POST "${BASE_URL}/api/webhooks/transcripts" \
  -H "Content-Type: application/json" \
  -H "X-WEBHOOK-SECRET: ${WEBHOOK_SECRET}" \
  -d @samples/webhook-transcript.json | jq .
