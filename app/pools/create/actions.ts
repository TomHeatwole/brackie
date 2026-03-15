"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createPool } from "@/lib/pools";
import { getActiveTournament } from "@/lib/tournament";

export interface CreatePoolFormState {
  error?: string;
  fieldErrors?: {
    name?: string;
  };
}

export async function createPoolAction(
  _prevState: CreatePoolFormState,
  formData: FormData
): Promise<CreatePoolFormState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const mode = formData.get("mode") as string | null;
  const testMode = mode === "test";

  if (!name) {
    return { fieldErrors: { name: "Pool name is required." } };
  }
  if (name.length > 50) {
    return { fieldErrors: { name: "Pool name must be 50 characters or fewer." } };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const tournament = await getActiveTournament(supabase, testMode);
  if (!tournament) {
    return { error: "No active tournament found." };
  }

  const pool = await createPool(supabase, user.id, name, tournament.id);
  if (!pool) {
    return { error: "Failed to create pool. Please try again." };
  }

  const params = testMode ? "?mode=test" : "";
  redirect(`/pools/${pool.id}${params}`);
}
