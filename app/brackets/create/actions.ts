"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createBracket, saveBracketPicks } from "@/lib/brackets";
import { getActiveTournament } from "@/lib/tournament";

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

  const params = testMode ? "?mode=test" : "";
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

  const success = await saveBracketPicks(supabase, bracketId, pickRows);
  if (!success) {
    return { success: false, error: "Failed to save picks." };
  }

  return { success: true };
}
