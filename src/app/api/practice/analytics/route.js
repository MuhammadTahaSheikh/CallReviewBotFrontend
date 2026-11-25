import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { getPracticeAnalytics } from "../../../../lib/practice/session-service";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const data = await getPracticeAnalytics({
      ownerUserId: auth.appUser.isAdmin ? undefined : auth.appUser.id,
    });
    return NextResponse.json({ ...data, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/practice/analytics", error);
    return NextResponse.json({ error: "Failed to load practice analytics" }, { status: 500 });
  }
}
