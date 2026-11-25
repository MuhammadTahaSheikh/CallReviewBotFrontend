import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseEnv } from "./env";

function isPublicPath(pathname) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/api/webhooks")) return true;
  return false;
}

/**
 * Refresh the auth session and gate protected routes.
 * Used by Next.js 16 `proxy.js`.
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    // Allow the app to boot; login page will show a setup message.
    if (!isPublicPath(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith("/_next")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
