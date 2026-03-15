import { SupabaseClient } from "@supabase/supabase-js";
import { Bracket, BracketPick, BracketWithPicks, TOTAL_GAMES } from "./types";
import { getTournament } from "./tournament";

export async function getUserBrackets(
  supabase: SupabaseClient,
  userId: string
): Promise<BracketWithPicks[]> {
  const { data: brackets } = await supabase
    .from("brackets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!brackets || brackets.length === 0) return [];

  const bracketIds = brackets.map((b: Bracket) => b.id);
  const { data: picks } = await supabase
    .from("bracket_picks")
    .select("*")
    .in("bracket_id", bracketIds);

  const picksByBracket = new Map<string, BracketPick[]>();
  for (const pick of picks ?? []) {
    const existing = picksByBracket.get(pick.bracket_id) ?? [];
    existing.push(pick);
    picksByBracket.set(pick.bracket_id, existing);
  }

  return brackets.map((b: Bracket) => {
    const bracketPicks = picksByBracket.get(b.id) ?? [];
    return {
      ...b,
      picks: bracketPicks,
      pick_count: bracketPicks.length,
    };
  });
}

export async function getBracket(
  supabase: SupabaseClient,
  bracketId: string
): Promise<BracketWithPicks | null> {
  const { data: bracket } = await supabase
    .from("brackets")
    .select("*")
    .eq("id", bracketId)
    .single();

  if (!bracket) return null;

  const { data: picks } = await supabase
    .from("bracket_picks")
    .select("*")
    .eq("bracket_id", bracketId);

  return {
    ...bracket,
    picks: picks ?? [],
    pick_count: picks?.length ?? 0,
  };
}

export async function createBracket(
  supabase: SupabaseClient,
  userId: string,
  tournamentId: string,
  name: string
): Promise<Bracket | null> {
  const { data, error } = await supabase
    .from("brackets")
    .insert({
      user_id: userId,
      tournament_id: tournamentId,
      name,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating bracket:", error);
    return null;
  }

  return data;
}

export async function saveBracketPicks(
  supabase: SupabaseClient,
  bracketId: string,
  picks: { game_id: string; picked_team_id: string }[]
): Promise<boolean> {
  await supabase.from("bracket_picks").delete().eq("bracket_id", bracketId);

  if (picks.length === 0) return true;

  const rows = picks.map((p) => ({
    bracket_id: bracketId,
    game_id: p.game_id,
    picked_team_id: p.picked_team_id,
  }));

  const { error } = await supabase.from("bracket_picks").insert(rows);

  if (error) {
    console.error("Error saving bracket picks:", error);
    return false;
  }

  return true;
}

export async function deleteBracket(
  supabase: SupabaseClient,
  bracketId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("brackets")
    .delete()
    .eq("id", bracketId);

  if (error) {
    console.error("Error deleting bracket:", error);
    return false;
  }

  return true;
}

export async function isBracketLocked(
  supabase: SupabaseClient,
  tournamentId: string,
  testMode: boolean
): Promise<boolean> {
  const tournament = await getTournament(supabase, tournamentId, testMode);
  if (!tournament || !tournament.lock_date) return false;
  return new Date() >= new Date(tournament.lock_date);
}

export function getBracketCompletionPct(pickCount: number): number {
  return Math.round((pickCount / TOTAL_GAMES) * 100);
}
