import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserInfo, isProfileComplete } from "@/utils/user-info";

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/finish-signing-up",
  "/robots.txt",
  "/rules", // scoring rules — only page accessible without logging in
  "/pools/join", // so crawlers get join page HTML (and its OG title) instead of redirect to login
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

// Exclude static assets and OG image so middleware never runs for them (avoids 401 for crawlers).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|share_logo\\.png|logo\\.png|robots\\.txt|manifest\\.webmanifest).*)",
  ],
};

/** Paths that skip auth entirely (static/public). */
function isStaticOrPublicPath(pathname: string) {
  if (isPublicPath(pathname)) return true;
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/manifest.webmanifest") return true;
  if (pathname === "/2026-teams.json") return true;
  if (/\.(ico|png|jpg|jpeg|gif|webp|svg|webmanifest)$/i.test(pathname)) return true;
  if (/sitemap\.xml$/i.test(pathname)) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isStaticOrPublicPath(pathname)) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SB_URL!,
    process.env.NEXT_PUBLIC_SB_PUBLIC_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do not add any logic between here and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If Supabase redirected the magic link to /login?code=... instead of
    // /auth/callback?code=..., forward it so the code gets exchanged properly.
    if (pathname === "/login" && request.nextUrl.searchParams.has("code")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/callback";
      return NextResponse.redirect(url);
    }

    if (isPublicPath(pathname)) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const fullPath = request.nextUrl.pathname + request.nextUrl.search;
    if (fullPath !== "/") {
      url.searchParams.set("next", fullPath);
    }
    return NextResponse.redirect(url);
  }

  // Logged-in user visiting /login — send to / for the profile check.
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Let /auth/callback and /finish-signing-up through without profile check.
  if (isPublicPath(pathname)) return supabaseResponse;

  const userInfo = await getUserInfo(supabase, user.id);
  if (!isProfileComplete(userInfo)) {
    const url = request.nextUrl.clone();
    url.pathname = "/finish-signing-up";
    const fullPath = request.nextUrl.pathname + request.nextUrl.search;
    if (fullPath !== "/") {
      url.searchParams.set("next", fullPath);
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
