import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const AUTH_NEXT_COOKIE = "auth_next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextFromUrl = searchParams.get("next");
  const nextFromCookie = request.headers.get("cookie")?.match(new RegExp(`${AUTH_NEXT_COOKIE}=([^;]+)`))?.[1];
  const nextRaw = nextFromUrl ?? (nextFromCookie ? decodeURIComponent(nextFromCookie) : null) ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const res = NextResponse.redirect(`${origin}${next}`);
  res.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
