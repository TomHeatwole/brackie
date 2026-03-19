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
  const [{ data: picks1 }, { data: picks2 }] = await Promise.all([
    supabase.from("bracket_picks").select("*").in("bracket_id", bracketIds).range(0, 999),
    supabase.from("bracket_picks").select("*").in("bracket_id", bracketIds).range(1000, 1999),
  ]);
  const picks = [...(picks1 ?? []), ...(picks2 ?? [])];

  const picksByBracket = new Map<string, BracketPick[]>();
  for (const pick of picks ?? []) {
    const existing = picksByBracket.get(pick.bracket_id) ?? [];
    existing.push(pick);
    picksByBracket.set(pick.bracket_id, existing);
  }

  // Count how many pools each bracket is submitted to so we can warn before deletion.
  const { data: poolBrackets } = await supabase
    .from("pool_brackets")
    .select("bracket_id")
    .in("bracket_id", bracketIds);

  const poolSubmissionCounts = new Map<string, number>();
  for (const pb of poolBrackets ?? []) {
    const id = (pb as { bracket_id: string }).bracket_id;
    poolSubmissionCounts.set(id, (poolSubmissionCounts.get(id) ?? 0) + 1);
  }

  const tournamentIds = [...new Set(brackets.map((b: Bracket) => b.tournament_id))];
  const { data: champGames } = await supabase
    .from("tournament_games")
    .select("id, tournament_id")
    .in("tournament_id", tournamentIds)
    .eq("round", 6);

  const champGameByTournament = new Map<string, string>();
  for (const g of champGames ?? []) {
    champGameByTournament.set(g.tournament_id, g.id);
  }

  const champTeamIds = new Set<string>();
  for (const b of brackets) {
    const bracketPicks = picksByBracket.get(b.id) ?? [];
    const champGameId = champGameByTournament.get(b.tournament_id);
    if (champGameId) {
      const champPick = bracketPicks.find((p) => p.game_id === champGameId);
      if (champPick) champTeamIds.add(champPick.picked_team_id);
    }
  }

  const teamMap = new Map<string, { name: string; seed: number; icon_url: string | null }>();
  if (champTeamIds.size > 0) {
    const { data: teams, error } = await supabase
      .from("teams")
      .select("id, name, seed, icon_url")
      .in("id", [...champTeamIds]);
    if (error) {
      const { data: fallback } = await supabase
        .from("teams")
        .select("id, name, seed")
        .in("id", [...champTeamIds]);
      for (const t of fallback ?? []) {
        teamMap.set(t.id, { name: t.name, seed: t.seed, icon_url: null });
      }
    } else {
      for (const t of teams ?? []) {
        const row = t as { id: string; name: string; seed: number; icon_url?: string | null };
        teamMap.set(row.id, {
          name: row.name,
          seed: row.seed,
          icon_url: row.icon_url ?? null,
        });
      }
    }
  }

  return brackets.map((b: Bracket) => {
    const bracketPicks = picksByBracket.get(b.id) ?? [];
    const champGameId = champGameByTournament.get(b.tournament_id);
    const champPick = champGameId
      ? bracketPicks.find((p) => p.game_id === champGameId)
      : undefined;
    const champTeam = champPick ? teamMap.get(champPick.picked_team_id) : undefined;

    return {
      ...b,
      picks: bracketPicks,
      pick_count: bracketPicks.length,
      champion_name: champTeam?.name,
      champion_seed: champTeam?.seed,
      champion_icon_url: champTeam?.icon_url ?? null,
      pool_submission_count: poolSubmissionCounts.get(b.id) ?? 0,
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
  tournamentId: string,
  picks: { game_id: string; picked_team_id: string }[]
): Promise<boolean> {
  await supabase.from("bracket_picks").delete().eq("bracket_id", bracketId);

  if (picks.length === 0) return true;

  const rows = picks.map((p) => ({
    bracket_id: bracketId,
    tournament_id: tournamentId,
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
