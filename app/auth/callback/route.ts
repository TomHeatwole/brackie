import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const AUTH_NEXT_COOKIE = "auth_next";

function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) out[name] = decodeURIComponent(value.replace(/^"(.*)"$/, "$1"));
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextFromUrl = searchParams.get("next");
  const nextFromCookie = request.headers.get("cookie")?.match(new RegExp(`${AUTH_NEXT_COOKIE}=([^;]+)`))?.[1];
  let nextRaw = nextFromUrl ?? (nextFromCookie ? decodeURIComponent(nextFromCookie) : null) ?? null;

  const redirectUrl = `${origin}${nextRaw && nextRaw.startsWith("/") ? nextRaw : "/"}`;
  // Explicit 302 so the browser reliably follows the redirect after setting cookies
  const res = NextResponse.redirect(redirectUrl, { status: 302 });

  if (code) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = parseCookieHeader(cookieHeader);
    const getAll = async () =>
      Object.entries(cookies).map(([name, value]) => ({ name, value }));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SB_URL!,
      process.env.NEXT_PUBLIC_SB_PUBLIC_KEY!,
      {
        cookies: {
          getAll,
          async setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (value) {
                res.cookies.set(name, value, {
                  path: options?.path ?? "/",
                  maxAge: options?.maxAge,
                  domain: options?.domain,
                  expires: options?.expires,
                  httpOnly: options?.httpOnly,
                  secure: options?.secure,
                  sameSite: options?.sameSite,
                });
              } else {
                res.cookies.set(name, "", { path: options?.path ?? "/", maxAge: 0 });
              }
            });
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);

    // Prefer stored redirect from DB (source of truth from when they requested the link).
    // Use service role to bypass RLS. Ensures invite/pool link persists even when cookie is "/" or missing.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const emailLower = user.email.toLowerCase();
      try {
        const { createServerAdminClient } = await import("@/utils/supabase/server-admin");
        const admin = createServerAdminClient();
        const { data: row } = await admin
          .from("pending_login_redirect")
          .select("next_path")
          .eq("email", emailLower)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (row?.next_path && row.next_path.startsWith("/")) {
          await admin.from("pending_login_redirect").delete().eq("email", emailLower);
          res.headers.set("Location", `${origin}${row.next_path}`);
        }
      } catch {
        // No service role key or admin client failed; keep redirect from cookie/url/default.
      }
    }
  }

  res.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
