import { NextResponse } from "next/server";
import { requireUser } from "../../../../../../lib/auth";
import { endPracticeSession, getPracticeSession } from "../../../../../../lib/practice/session-service";

export async function POST(request, { params }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const owned = await getPracticeSession(id, { appUser: auth.appUser });
    if (!owned) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    let abandoned = false;
    try {
      const body = await request.json();
      abandoned = Boolean(body?.abandoned);
    } catch {
      /* empty body ok */
    }
    const session = await endPracticeSession(id, { abandoned });
    return NextResponse.json({ session });
  } catch (error) {
    const code = error.statusCode || 500;
    if (code < 500) return NextResponse.json({ error: error.message }, { status: code });
    console.error("POST practice end", error);
    return NextResponse.json({ error: error.message || "Failed to end session" }, { status: 500 });
  }
}
