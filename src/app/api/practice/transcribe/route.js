import { NextResponse } from "next/server";

/**
 * Server Whisper is disabled: onnxruntime-node fails to load its native
 * binding on this Windows host. Browser CDN Whisper is used instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Server transcription is unavailable. Use Speak → talk (live text) or Speak → Stop for in-browser Whisper.",
    },
    { status: 501 }
  );
}
