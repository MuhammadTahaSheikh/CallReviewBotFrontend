import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { getPracticeSession } from "../../../../../lib/practice/session-service";

export async function GET(_request, { params }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const session = await getPracticeSession(id, { appUser: auth.appUser });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ session });
  } catch (error) {
    console.error("GET /api/practice/sessions/[id]", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
