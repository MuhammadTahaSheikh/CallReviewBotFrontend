import { NextResponse } from "next/server";
import { requireUser } from "../../../../../../lib/auth";
import { evaluatePracticeSession, getPracticeSession } from "../../../../../../lib/practice/session-service";

export async function POST(_request, { params }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const owned = await getPracticeSession(id, { appUser: auth.appUser });
    if (!owned) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const session = await evaluatePracticeSession(id);
    return NextResponse.json({ session });
  } catch (error) {
    const code = error.statusCode || 500;
    if (code < 500) return NextResponse.json({ error: error.message }, { status: code });
    console.error("POST practice evaluate", error);
    return NextResponse.json(
      { error: error.message || "Evaluation failed", code: "EVALUATION_FAILED" },
      { status: 500 }
    );
  }
}
