import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { createPracticeSession, listPracticeSessions } from "../../../../lib/practice/session-service";

export async function GET(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sessions = await listPracticeSessions({
      callType: searchParams.get("callType") || "all",
      difficulty: searchParams.get("difficulty") || "all",
      status: searchParams.get("status") || "all",
      scenarioId: searchParams.get("scenarioId") || "all",
      q: searchParams.get("q") || "",
      limit: searchParams.get("limit") || 100,
      ownerUserId: auth.appUser.isAdmin ? undefined : auth.appUser.id,
    });
    return NextResponse.json({ sessions, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/practice/sessions", error);
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const session = await createPracticeSession({
      scenarioId: body.scenarioId,
      difficulty: body.difficulty || "intermediate",
      representativeName: body.representativeName || auth.appUser.fullName || "",
      ownerUserId: auth.appUser.id,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const code = error.statusCode || 500;
    if (code < 500) return NextResponse.json({ error: error.message }, { status: code });
    console.error("POST /api/practice/sessions", error);
    return NextResponse.json({ error: error.message || "Failed to create session" }, { status: 500 });
  }
}
