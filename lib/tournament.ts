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

  const { data: config } = await supabase
    .from("site_config")
    .select("active_tournament_id")
    .eq("id", 1)
    .single();

  if (!config?.active_tournament_id) return null;

  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", config.active_tournament_id)
    .single();

  return data;
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
