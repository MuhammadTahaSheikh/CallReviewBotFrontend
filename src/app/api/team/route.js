import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getTeamPerformance } from "../../../lib/services/team-performance";

export async function GET(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const callType = searchParams.get("callType") || "all";
    const data = await getTeamPerformance({
      callType,
      ownerUserId: auth.appUser.isAdmin ? undefined : auth.appUser.id,
    });
    return NextResponse.json({ ...data, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/team", error);
    return NextResponse.json({ error: "Failed to load team performance" }, { status: 500 });
  }
}
