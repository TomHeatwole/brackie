"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createBracket, saveBracketPicks } from "@/lib/brackets";
import { getActiveTournament } from "@/lib/tournament";
import { submitBracketToPool } from "@/lib/pools";

export interface CreateBracketFormState {
  error?: string;
  fieldErrors?: {
    name?: string;
  };
  bracketId?: string;
}

export async function createBracketAction(
  _prevState: CreateBracketFormState,
  formData: FormData
): Promise<CreateBracketFormState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const mode = formData.get("mode") as string | null;
  const testMode = mode === "test";
  const poolId = formData.get("pool_id") as string | null;

  if (!name) {
    return { fieldErrors: { name: "Bracket name is required." } };
  }
  if (name.length > 50) {
    return { fieldErrors: { name: "Name must be 50 characters or fewer." } };
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

  const bracket = await createBracket(supabase, user.id, tournament.id, name);
  if (!bracket) {
    return { error: "Failed to create bracket." };
  }

  const queryParts: string[] = [];
  if (testMode) queryParts.push("mode=test");
  if (poolId) queryParts.push(`pool=${poolId}`);
  const params = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  redirect(`/brackets/${bracket.id}${params}`);
}

export async function saveBracketPicksAction(
  bracketId: string,
  picks: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: bracket } = await supabase
    .from("brackets")
    .select("user_id, tournament_id")
    .eq("id", bracketId)
    .single();

  if (!bracket || bracket.user_id !== user.id) {
    return { success: false, error: "Bracket not found." };
  }

  const pickRows = Object.entries(picks).map(([gameId, teamId]) => ({
    game_id: gameId,
    picked_team_id: teamId,
  }));

  const success = await saveBracketPicks(supabase, bracketId, bracket.tournament_id, pickRows);
  if (!success) {
    return { success: false, error: "Failed to save picks." };
  }

  return { success: true };
}

export async function saveAndSubmitToPoolAction(
  bracketId: string,
  poolId: string,
  picks: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: bracket } = await supabase
    .from("brackets")
    .select("user_id, tournament_id")
    .eq("id", bracketId)
    .single();

  if (!bracket || bracket.user_id !== user.id) {
    return { success: false, error: "Bracket not found." };
  }

  const pickRows = Object.entries(picks).map(([gameId, teamId]) => ({
    game_id: gameId,
    picked_team_id: teamId,
  }));

  const saveOk = await saveBracketPicks(supabase, bracketId, bracket.tournament_id, pickRows);
  if (!saveOk) {
    return { success: false, error: "Failed to save picks." };
  }

  const submitResult = await submitBracketToPool(supabase, poolId, bracketId, user.id);
  if (!submitResult.success) {
    return { success: false, error: submitResult.error ?? "Failed to submit to pool." };
  }

  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
