import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { getAiMode } from "../../../lib/ai/provider";
import { getPolicySettings, savePolicySettings } from "../../../lib/services/policy-settings";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const profiles = await prisma.scoringProfile.findMany({ orderBy: { label: "asc" } });
    const policy = await getPolicySettings();

    return NextResponse.json({
      aiMode: getAiMode(),
      profiles: profiles.map((p) => ({
        ...p,
        categories: JSON.parse(p.categories || "[]"),
      })),
      policy,
      viewer: auth.appUser,
    });
  } catch (error) {
    console.error("GET /api/profiles", error);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const policy = await savePolicySettings(body || {});
    return NextResponse.json({ policy });
  } catch (error) {
    console.error("PATCH /api/profiles", error);
    return NextResponse.json({ error: "Failed to save policy settings" }, { status: 500 });
  }
}
