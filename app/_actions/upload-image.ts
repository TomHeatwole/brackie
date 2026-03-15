"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file") as File | null;
  const storagePath = (formData.get("storagePath") as string) ?? "uploads";

  if (!file || file.size === 0) {
    return { error: "No file provided." };
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { error: "Please upload a JPEG, PNG, WebP, or GIF image." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Image must be smaller than 5 MB." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to upload images." };
  }

  // Use service role key if available (bypasses RLS), otherwise fall back
  // to a direct client with the user's JWT for storage operations.
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SB_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SB_PUBLIC_KEY!;

  let storageClient;
  if (serviceKey) {
    storageClient = createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  } else {
    const { data: { session } } = await supabase.auth.getSession();
    storageClient = createSupabaseClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      },
      auth: { persistSession: false },
    });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${storagePath}/${crypto.randomUUID()}.${ext}`;

  const { error: storageError } = await storageClient.storage
    .from("profiles")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    console.error("Storage upload error:", storageError);
    return { error: `Upload failed: ${storageError.message}` };
  }

  const { data: publicUrlData } = storageClient.storage
    .from("profiles")
    .getPublicUrl(fileName);

  return { url: publicUrlData.publicUrl };
}
