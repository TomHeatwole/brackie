"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { joinPool } from "@/lib/pools";

export interface JoinPoolFormState {
  error?: string;
  success?: boolean;
}

export async function joinPoolAction(
  _prevState: JoinPoolFormState,
  formData: FormData
): Promise<JoinPoolFormState> {
  const inviteCode = (formData.get("invite_code") as string | null)?.trim() ?? "";
  const mode = formData.get("mode") as string | null;
  const testMode = mode === "test";

  if (!inviteCode) {
    return { error: "Invite code is required." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const result = await joinPool(supabase, user.id, inviteCode);
  if (!result.success) {
    return { error: result.error ?? "Failed to join pool." };
  }

  const params = testMode ? "?mode=test" : "";
  redirect(`/pools/${result.poolId}${params}`);
}
