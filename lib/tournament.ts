import { SupabaseClient } from "@supabase/supabase-js";
import { Tournament, Team, TournamentGame } from "./types";
import { TEST_TOURNAMENT, TEST_TEAMS, TEST_GAMES } from "./test-data";

export function isTestMode(searchParams: Record<string, string | string[] | undefined>): boolean {
  return searchParams?.mode === "test";
}

export async function getActiveTournament(
  supabase: SupabaseClient,
  testMode: boolean
): Promise<Tournament | null> {
  if (testMode) {
    return TEST_TOURNAMENT;
  }

  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["upcoming", "active"])
    .order("year", { ascending: false })
    .limit(1)
    .single();

  return data;
}

export function parseTournamentOverride(
  searchParams: Record<string, string | string[] | undefined>
): string | null {
  const rawUpper = searchParams?.tournament_ID;
  const rawLower = searchParams?.tournament_id;
  const chosen =
    (Array.isArray(rawUpper) ? rawUpper[0] : rawUpper) ??
    (Array.isArray(rawLower) ? rawLower[0] : rawLower);
  const value = chosen ?? null;
  if (!value) return null;

  // Basic UUID v4-ish format check; keep loose to avoid blocking valid IDs.
  const uuidRegex = /^[0-9a-fA-F-]{20,}$/;
  return uuidRegex.test(value) ? value : null;
}

export async function getEffectiveTournament(
  supabase: SupabaseClient,
  options: {
    testMode: boolean;
    overrideTournamentId?: string | null;
  }
): Promise<{ tournament: Tournament | null; overrideSource: "query" | "active" | "test" }> {
  const { testMode, overrideTournamentId } = options;

  if (testMode) {
    return { tournament: TEST_TOURNAMENT, overrideSource: "test" };
  }

  const overrideId = overrideTournamentId ?? null;

  if (overrideId) {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", overrideId)
      .single();

    if (data) {
      return { tournament: data, overrideSource: "query" };
    }
  }

  const active = await getActiveTournament(supabase, false);
  return { tournament: active, overrideSource: "active" };
}

export async function getTournament(
  supabase: SupabaseClient,
  tournamentId: string,
  testMode: boolean
): Promise<Tournament | null> {
  if (testMode) {
    return TEST_TOURNAMENT.id === tournamentId ? TEST_TOURNAMENT : null;
  }

  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  return data;
}

export async function getTeams(
  supabase: SupabaseClient,
  tournamentId: string,
  testMode: boolean
): Promise<Team[]> {
  if (testMode) {
    return TEST_TEAMS.filter((t) => t.tournament_id === tournamentId);
  }

  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("region")
    .order("seed");

  return data ?? [];
}

export async function getTeamsByRegion(
  supabase: SupabaseClient,
  tournamentId: string,
  region: string,
  testMode: boolean
): Promise<Team[]> {
  if (testMode) {
    return TEST_TEAMS.filter(
      (t) => t.tournament_id === tournamentId && t.region === region
    );
  }

  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("region", region)
    .order("seed");

  return data ?? [];
}

export async function getGames(
  supabase: SupabaseClient,
  tournamentId: string,
  testMode: boolean
): Promise<TournamentGame[]> {
  if (testMode) {
    return TEST_GAMES.filter((g) => g.tournament_id === tournamentId);
  }

  const { data } = await supabase
    .from("tournament_games")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round")
    .order("position");

  return data ?? [];
}

export async function getGamesByRegion(
  supabase: SupabaseClient,
  tournamentId: string,
  region: string,
  testMode: boolean
): Promise<TournamentGame[]> {
  if (testMode) {
    return TEST_GAMES.filter(
      (g) => g.tournament_id === tournamentId && g.region === region
    );
  }

  const { data } = await supabase
    .from("tournament_games")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("region", region)
    .order("round")
    .order("position");

  return data ?? [];
}

export function isTournamentLocked(tournament: Tournament): boolean {
  if (!tournament.lock_date) return false;
  return new Date() >= new Date(tournament.lock_date);
}
