import { NextResponse } from "next/server";
import { requireUser } from "../../../../../../lib/auth";
import { addPracticeMessage, getPracticeSession } from "../../../../../../lib/practice/session-service";

export async function POST(request, { params }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const owned = await getPracticeSession(id, { appUser: auth.appUser });
    if (!owned) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const body = await request.json();
    const session = await addPracticeMessage(id, {
      content: body.content,
      inputMethod: body.inputMethod,
      clientMessageId: body.clientMessageId,
    });
    return NextResponse.json({ session });
  } catch (error) {
    const code = error.statusCode || 500;
    if (code < 500) return NextResponse.json({ error: error.message }, { status: code });
    console.error("POST practice messages", error);
    return NextResponse.json({ error: error.message || "Failed to send message" }, { status: 500 });
  }
}
