import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
import { ensureAppUser, serializeAppUser } from "./services/app-users";

/**
 * Require a signed-in Supabase user and synced AppUser row.
 * Returns { user, appUser } or { response } (401/403).
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return {
      user: null,
      appUser: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const email = claims.email || claims.user_metadata?.email || null;
  const fullName = claims.user_metadata?.full_name || claims.user_metadata?.name || null;

  let appUser;
  try {
    appUser = await ensureAppUser({
      supabaseUserId: claims.sub,
      email,
      fullName,
    });
  } catch (err) {
    console.error("ensureAppUser", err);
    return {
      user: null,
      appUser: null,
      response: NextResponse.json({ error: "Failed to sync user profile" }, { status: 500 }),
    };
  }

  return {
    user: {
      id: claims.sub,
      email: appUser.email,
      fullName: appUser.fullName,
      claims,
    },
    appUser: serializeAppUser(appUser),
    response: null,
  };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.response) return result;
  if (!result.appUser?.isAdmin) {
    return {
      ...result,
      response: NextResponse.json({ error: "Admin only" }, { status: 403 }),
    };
  }
  return result;
}
