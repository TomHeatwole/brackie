"use server";

import { createClient } from "@/utils/supabase/server";

const REDIRECT_TTL_MINUTES = 10;

/**
 * Store the post-login redirect path for this email so the auth callback can
 * send the user there after the magic link is used (even when the link is
 * opened in a different browser/context where the auth_next cookie isn't sent).
 */
export async function savePendingRedirect(email: string, nextPath: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !nextPath.startsWith("/")) return;

  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + REDIRECT_TTL_MINUTES * 60 * 1000).toISOString();

  await supabase.from("pending_login_redirect").upsert(
    { email: normalizedEmail, next_path: nextPath, expires_at: expiresAt },
    { onConflict: "email" }
  );
}
