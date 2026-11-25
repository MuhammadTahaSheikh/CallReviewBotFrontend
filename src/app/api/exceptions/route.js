import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { listOpenExceptions, transitionException } from "../../../lib/services/exceptions";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const items = await listOpenExceptions({
      ownerUserId: auth.appUser.isAdmin ? undefined : auth.appUser.id,
    });
    return NextResponse.json({ items, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/exceptions", error);
    return NextResponse.json({ error: "Failed to load exceptions" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { id, status, notes } = body || {};
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    // Non-admins may only act on exceptions for their own calls
    if (!auth.appUser.isAdmin) {
      const { prisma } = await import("../../../lib/prisma");
      const row = await prisma.exceptionReview.findUnique({
        where: { id },
        include: { call: { select: { ownerUserId: true } } },
      });
      if (!row || row.call?.ownerUserId !== auth.appUser.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const updated = await transitionException({ id, status, notes });
    return NextResponse.json({ item: updated });
  } catch (error) {
    const code = error.statusCode || 500;
    if (code !== 500) {
      return NextResponse.json({ error: error.message }, { status: code });
    }
    console.error("PATCH /api/exceptions", error);
    return NextResponse.json({ error: "Failed to update exception" }, { status: 500 });
  }
}
