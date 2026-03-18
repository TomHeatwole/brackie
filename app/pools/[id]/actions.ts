"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  submitBracketToPool,
  getPoolGoodiesWithTypes,
  removePoolMember,
} from "@/lib/pools";

export interface SubmitBracketFormState {
  error?: string;
  success?: boolean;
}

export async function submitBracketToPoolAction(
  _prevState: SubmitBracketFormState,
  formData: FormData
): Promise<SubmitBracketFormState> {
  const bracketId = formData.get("bracket_id") as string | null;
  const poolId = formData.get("pool_id") as string | null;
  const modeParam = (formData.get("mode_param") as string | null) ?? "";

  if (!bracketId || !poolId) {
    return { error: "Missing required fields." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const result = await submitBracketToPool(supabase, poolId, bracketId, user.id);
  if (!result.success) {
    return { error: result.error ?? "Failed to submit bracket." };
  }

  revalidatePath(`/pools/${poolId}`);

  const { data: pool } = await supabase
    .from("pools")
    .select("goodies_enabled")
    .eq("id", poolId)
    .single();

  const poolGoodiesWithTypes = await getPoolGoodiesWithTypes(supabase, poolId);
  const userInputGoodies = poolGoodiesWithTypes.filter(
    (pg) => pg.goody_types?.input_type === "user_input"
  );
  if (pool?.goodies_enabled && userInputGoodies.length > 0) {
    redirect(`/pools/${poolId}/goody-picks${modeParam}`);
  }

  return { success: true };
}

export interface RemovePoolMemberState {
  error?: string;
  success?: boolean;
}

export async function removePoolMemberAction(
  poolId: string,
  memberUserId: string
): Promise<RemovePoolMemberState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: pool } = await supabase
    .from("pools")
    .select("creator_id")
    .eq("id", poolId)
    .single();

  if (!pool || pool.creator_id !== user.id) {
    return { error: "Only the pool creator can remove members." };
  }

  if (memberUserId === user.id) {
    return { error: "You cannot remove yourself. Leave the pool instead." };
  }

  const result = await removePoolMember(supabase, poolId, memberUserId);
  if (!result.success) {
    return { error: result.error ?? "Failed to remove member." };
  }

  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
