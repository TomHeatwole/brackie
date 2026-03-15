"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { deleteBracket } from "@/lib/brackets";

export async function deleteBracketAction(
  bracketId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: bracket } = await supabase
    .from("brackets")
    .select("user_id")
    .eq("id", bracketId)
    .single();

  if (!bracket || bracket.user_id !== user.id) {
    return { success: false, error: "Bracket not found." };
  }

  const success = await deleteBracket(supabase, bracketId);
  if (!success) {
    return { success: false, error: "Failed to delete bracket." };
  }

  revalidatePath("/brackets");
  revalidatePath("/");
  return { success: true };
}
