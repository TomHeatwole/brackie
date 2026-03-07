import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SB_URL;
  const key = process.env.NEXT_PUBLIC_SB_PUBLIC_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SB_URL and NEXT_PUBLIC_SB_PUBLIC_KEY must be set."
    );
  }

  return createBrowserClient(url, key);
}
