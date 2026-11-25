import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { listAppUsers, setAppUserRole } from "../../../lib/services/app-users";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const users = await listAppUsers();
    return NextResponse.json({ users, viewer: auth.appUser });
  } catch (error) {
    console.error("GET /api/users", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const updated = await setAppUserRole({
      actor: auth.appUser,
      targetUserId: body.userId,
      role: body.role,
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    const code = error.statusCode || 500;
    if (code < 500) return NextResponse.json({ error: error.message }, { status: code });
    console.error("PATCH /api/users", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
