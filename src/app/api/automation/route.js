import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const rows = await prisma.automationExecution.findMany({
      where: auth.appUser.isAdmin ? undefined : { call: { ownerUserId: auth.appUser.id } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ rows, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/automation", error);
    return NextResponse.json({ error: "Failed to load automation log" }, { status: 500 });
  }
}
