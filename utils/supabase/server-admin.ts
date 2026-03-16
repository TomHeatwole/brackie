import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with service role key. Bypasses RLS.
 * Use only in route handlers or server actions; never expose to the client.
 */
export function createServerAdminClient() {
  const url = process.env.NEXT_PUBLIC_SB_URL;
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SB_URL or SB_SERVICE_ROLE_KEY for server admin client."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
