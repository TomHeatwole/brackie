"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { REGIONS, SEED_MATCHUPS, FINAL_FOUR_MATCHUPS, Region } from "@/lib/types";

const DEFAULT_TEAM_NAMES: Record<Region, string[]> = {
  East: [
    "Crimson Hawks", "Blue Devils", "Golden Bears", "Silver Wolves",
    "Green Dragons", "Purple Knights", "Red Foxes", "Black Panthers",
    "White Eagles", "Orange Tigers", "Teal Sharks", "Bronze Rams",
    "Ivory Owls", "Scarlet Lions", "Navy Stallions", "Copper Cobras",
  ],
  West: [
    "Storm Chasers", "Fire Phoenixes", "Iron Bulldogs", "Thunder Bolts",
    "Ocean Waves", "Desert Hawks", "Mountain Lions", "Forest Rangers",
    "River Otters", "Prairie Wolves", "Canyon Eagles", "Glacier Bears",
    "Valley Vipers", "Sunset Falcons", "Tundra Yaks", "Coral Crabs",
  ],
  South: [
    "Royal Jaguars", "Diamond Rattlers", "Platinum Mustangs", "Jade Scorpions",
    "Amber Hornets", "Obsidian Ravens", "Sapphire Dolphins", "Ruby Wildcats",
    "Emerald Turtles", "Topaz Cougars", "Pearl Pelicans", "Garnet Gators",
    "Onyx Bison", "Citrine Cranes", "Opal Antelopes", "Quartz Armadillos",
  ],
  Midwest: [
    "Steel Titans", "Maple Monarchs", "Granite Grizzlies", "Cedar Spartans",
    "Birch Badgers", "Pine Lancers", "Oak Trojans", "Elm Pioneers",
    "Ash Miners", "Willow Warhawks", "Cypress Cyclones", "Magnolia Mavericks",
    "Hickory Huskies", "Redwood Raiders", "Sequoia Sentinels", "Palm Paladins",
  ],
};

export interface AdminActionResult {
  success: boolean;
  message: string;
}

// ── Tournament CRUD ──

export async function createTournamentAction(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const name = (formData.get("name") as string)?.trim();
  const year = parseInt(formData.get("year") as string, 10);
  const lockDate = (formData.get("lock_date") as string)?.trim() || null;
  const status = (formData.get("status") as string) || "upcoming";

  if (!name || !year) {
    return { success: false, message: "Name and year are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").insert({
    name,
    year,
    lock_date: lockDate ? new Date(lockDate).toISOString() : null,
    status,
  });

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin");
  return { success: true, message: `Tournament "${name}" created.` };
}

export async function updateTournamentStatusAction(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const tournamentId = formData.get("tournament_id") as string;
  const status = formData.get("status") as string;

  if (!tournamentId || !status) {
    return { success: false, message: "Tournament and status are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ status })
    .eq("id", tournamentId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin");
  return { success: true, message: `Status updated to "${status}".` };
}

export async function updateTournamentLockDateAction(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const tournamentId = formData.get("tournament_id") as string;
  const lockDate = (formData.get("lock_date") as string)?.trim();

  if (!tournamentId) {
    return { success: false, message: "Tournament is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ lock_date: lockDate ? new Date(lockDate).toISOString() : null })
    .eq("id", tournamentId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin");
  return { success: true, message: "Lock date updated." };
}

export async function deleteTournamentAction(
  tournamentId: string
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin");
  return { success: true, message: "Tournament deleted." };
}

// ── Seed teams + games ──

export async function seedTournamentAction(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const tournamentId = formData.get("tournament_id") as string;
  if (!tournamentId) {
    return { success: false, message: "Tournament is required." };
  }

  const supabase = await createClient();

  // Check if teams already exist
  const { data: existingTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .limit(1);

  if (existingTeams && existingTeams.length > 0) {
    return { success: false, message: "Tournament already has teams. Delete them first." };
  }

  // Insert 64 teams
  const teamRows: { tournament_id: string; name: string; seed: number; region: string }[] = [];
  for (const region of REGIONS) {
    for (let seed = 1; seed <= 16; seed++) {
      teamRows.push({
        tournament_id: tournamentId,
        name: DEFAULT_TEAM_NAMES[region][seed - 1],
        seed,
        region,
      });
    }
  }

  const { data: insertedTeams, error: teamsError } = await supabase
    .from("teams")
    .insert(teamRows)
    .select("id, seed, region");

  if (teamsError || !insertedTeams) {
    return { success: false, message: `Failed to insert teams: ${teamsError?.message}` };
  }

  // Build lookup: region+seed → team id
  const teamLookup = new Map<string, string>();
  for (const t of insertedTeams) {
    teamLookup.set(`${t.region}-${t.seed}`, t.id);
  }

  // Insert 63 games
  const gameRows: {
    tournament_id: string;
    round: number;
    position: number;
    region: string | null;
    team1_id: string | null;
    team2_id: string | null;
  }[] = [];

  // Round 1: 8 games per region, teams pre-filled from seeding
  for (const region of REGIONS) {
    for (let pos = 0; pos < SEED_MATCHUPS.length; pos++) {
      const [seedA, seedB] = SEED_MATCHUPS[pos];
      gameRows.push({
        tournament_id: tournamentId,
        round: 1,
        position: pos,
        region,
        team1_id: teamLookup.get(`${region}-${seedA}`) ?? null,
        team2_id: teamLookup.get(`${region}-${seedB}`) ?? null,
      });
    }
  }

  // Rounds 2-4: regional games, teams TBD
  for (const region of REGIONS) {
    for (let pos = 0; pos < 4; pos++) {
      gameRows.push({ tournament_id: tournamentId, round: 2, position: pos, region, team1_id: null, team2_id: null });
    }
    for (let pos = 0; pos < 2; pos++) {
      gameRows.push({ tournament_id: tournamentId, round: 3, position: pos, region, team1_id: null, team2_id: null });
    }
    gameRows.push({ tournament_id: tournamentId, round: 4, position: 0, region, team1_id: null, team2_id: null });
  }

  // Round 5: Final Four (2 games)
  for (let pos = 0; pos < FINAL_FOUR_MATCHUPS.length; pos++) {
    gameRows.push({ tournament_id: tournamentId, round: 5, position: pos, region: null, team1_id: null, team2_id: null });
  }

  // Round 6: Championship
  gameRows.push({ tournament_id: tournamentId, round: 6, position: 0, region: null, team1_id: null, team2_id: null });

  const { error: gamesError } = await supabase.from("tournament_games").insert(gameRows);

  if (gamesError) {
    return { success: false, message: `Teams created but games failed: ${gamesError.message}` };
  }

  revalidatePath("/admin");
  return { success: true, message: "Seeded 64 teams + 63 games." };
}

export async function clearTournamentDataAction(
  tournamentId: string
): Promise<AdminActionResult> {
  const supabase = await createClient();

  // Games reference teams, so delete games first
  const { error: gamesErr } = await supabase
    .from("tournament_games")
    .delete()
    .eq("tournament_id", tournamentId);
  if (gamesErr) return { success: false, message: `Games delete failed: ${gamesErr.message}` };

  const { error: teamsErr } = await supabase
    .from("teams")
    .delete()
    .eq("tournament_id", tournamentId);
  if (teamsErr) return { success: false, message: `Teams delete failed: ${teamsErr.message}` };

  revalidatePath("/admin");
  return { success: true, message: "Cleared all teams and games." };
}

// ── Raw query (read-only SELECT) ──

export async function rawSelectAction(
  _prev: { success: boolean; message: string; rows: Record<string, unknown>[] },
  formData: FormData
): Promise<{ success: boolean; message: string; rows: Record<string, unknown>[] }> {
  const table = (formData.get("table") as string)?.trim();
  const limitStr = (formData.get("limit") as string)?.trim() || "20";
  const filterCol = (formData.get("filter_col") as string)?.trim();
  const filterVal = (formData.get("filter_val") as string)?.trim();

  if (!table) {
    return { success: false, message: "Table name is required.", rows: [] };
  }

  const limit = Math.min(parseInt(limitStr, 10) || 20, 100);

  const supabase = await createClient();
  let query = supabase.from(table).select("*").limit(limit);

  if (filterCol && filterVal) {
    query = query.eq(filterCol, filterVal);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, message: error.message, rows: [] };
  }

  return { success: true, message: `${data.length} row(s) from "${table}"`, rows: data ?? [] };
}

// ── Game results (admin override) ──

export interface GameWithTeamNames {
  id: string;
  round: number;
  position: number;
  region: string | null;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  team1_name: string | null;
  team2_name: string | null;
  winner_name: string | null;
}

export async function getTournamentGamesForAdminAction(
  tournamentId: string
): Promise<{ games: GameWithTeamNames[]; error?: string }> {
  const supabase = await createClient();
  const { data: games, error: gamesErr } = await supabase
    .from("tournament_games")
    .select("id, round, position, region, team1_id, team2_id, winner_id")
    .eq("tournament_id", tournamentId)
    .order("round")
    .order("position");

  if (gamesErr || !games) {
    return { games: [], error: gamesErr?.message ?? "Failed to load games." };
  }

  const teamIds = new Set<string>();
  for (const g of games) {
    if (g.team1_id) teamIds.add(g.team1_id);
    if (g.team2_id) teamIds.add(g.team2_id);
    if (g.winner_id) teamIds.add(g.winner_id);
  }
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", [...teamIds]);

  const nameById = new Map<string, string>();
  for (const t of teams ?? []) {
    nameById.set(t.id, t.name);
  }

  const result: GameWithTeamNames[] = games.map((g) => ({
    ...g,
    team1_name: g.team1_id ? nameById.get(g.team1_id) ?? null : null,
    team2_name: g.team2_id ? nameById.get(g.team2_id) ?? null : null,
    winner_name: g.winner_id ? nameById.get(g.winner_id) ?? null : null,
  }));

  return { games: result };
}

export async function setGameWinnerAction(
  gameId: string,
  winnerId: string | null
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_games")
    .update({ winner_id: winnerId })
    .eq("id", gameId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/pools");
  revalidatePath("/brackets");
  return { success: true, message: "Game result updated." };
}

// ── Team edit (name, icon) ──

export async function getTournamentTeamsForAdminAction(
  tournamentId: string
): Promise<{ teams: { id: string; name: string; seed: number; region: string; icon_url: string | null }[]; error?: string }> {
  const supabase = await createClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, seed, region, icon_url")
    .eq("tournament_id", tournamentId)
    .order("region")
    .order("seed");

  if (error) {
    return { teams: [], error: error.message };
  }
  return { teams: teams ?? [] };
}

export async function updateTeamAction(
  teamId: string,
  updates: { name?: string; icon_url?: string | null }
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (updates.name !== undefined) update.name = updates.name.trim();
  if (updates.icon_url !== undefined) update.icon_url = updates.icon_url?.trim() || null;

  if (Object.keys(update).length === 0) {
    return { success: false, message: "No changes provided." };
  }

  const { error } = await supabase.from("teams").update(update).eq("id", teamId);

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/pools");
  revalidatePath("/brackets");
  return { success: true, message: "Team updated." };
}
