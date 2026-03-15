"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { submitBracketToPool } from "@/lib/pools";

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
  return { success: true };
}
