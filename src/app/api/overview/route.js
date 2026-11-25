import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getOverviewStats } from "../../../lib/services/analyze-call";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const data = await getOverviewStats({
      ownerUserId: auth.appUser.isAdmin ? undefined : auth.appUser.id,
    });
    return NextResponse.json({ ...data, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/overview", error);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
