import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  return NextResponse.json({ user: auth.user, appUser: auth.appUser });
}
