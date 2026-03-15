import { createClient } from "@supabase/supabase-js";

export function createStorageAdmin() {
  const url = process.env.NEXT_PUBLIC_SB_URL;
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing environment variables: NEXT_PUBLIC_SB_URL and SB_SERVICE_ROLE_KEY must be set for storage operations."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
