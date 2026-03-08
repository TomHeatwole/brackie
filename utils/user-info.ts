import { SupabaseClient } from "@supabase/supabase-js";

export interface UserInfo {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export async function getUserInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<UserInfo | null> {
  const { data, error } = await supabase
    .from("user_info")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserInfo;
}

export function isProfileComplete(userInfo: UserInfo | null): boolean {
  if (!userInfo) return false;
  return (
    !!userInfo.first_name?.trim() &&
    !!userInfo.last_name?.trim() &&
    !!userInfo.username?.trim()
  );
}
