"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { removePoolMember } from "@/lib/pools";
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
  const regionTopLeft = (formData.get("region_top_left") as string)?.trim() || "East";
  const regionTopRight = (formData.get("region_top_right") as string)?.trim() || "West";
  const regionBottomLeft = (formData.get("region_bottom_left") as string)?.trim() || "South";
  const regionBottomRight = (formData.get("region_bottom_right") as string)?.trim() || "Midwest";

  if (!name || !year) {
    return { success: false, message: "Name and year are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").insert({
    name,
    year,
    lock_date: lockDate ? new Date(lockDate).toISOString() : null,
    status,
    region_top_left: regionTopLeft,
    region_top_right: regionTopRight,
    region_bottom_left: regionBottomLeft,
    region_bottom_right: regionBottomRight,
  });

  if (error) return { success: false, message: error.message };
  revalidatePath("/admin");
  return { success: true, message: `Tournament "${name}" created.` };
}

export async function duplicateTournamentAction(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const sourceTournamentId = (formData.get("tournament_id") as string)?.trim();
  if (!sourceTournamentId) {
    return { success: false, message: "Tournament is required." };
  }

  const supabase = await createClient();

  const { data: source, error: sourceErr } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", sourceTournamentId)
    .single();

  if (sourceErr || !source) {
    return { success: false, message: "Source tournament not found." };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("tournaments")
    .insert({
      name: `${source.name} (Copy)`,
      year: source.year,
      lock_date: null,
      status: "upcoming",
      region_top_left: source.region_top_left,
      region_top_right: source.region_top_right,
      region_bottom_left: source.region_bottom_left,
      region_bottom_right: source.region_bottom_right,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { success: false, message: insertErr?.message ?? "Failed to create duplicate tournament." };
  }

  const newTournamentId = inserted.id as string;

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name, seed, region, icon_url")
    .eq("tournament_id", sourceTournamentId);

  if (teamsErr) {
    return { success: false, message: `Failed to load teams: ${teamsErr.message}` };
  }

  let teamIdMap = new Map<string, string>();

  if (teams && teams.length > 0) {
    const teamRows = teams.map((t) => ({
      tournament_id: newTournamentId,
      name: t.name,
      seed: t.seed,
      region: t.region,
      icon_url: t.icon_url,
    }));

    const { data: newTeams, error: newTeamsErr } = await supabase
      .from("teams")
      .insert(teamRows)
      .select("id, seed, region");

    if (newTeamsErr || !newTeams) {
      return { success: false, message: `Failed to duplicate teams: ${newTeamsErr?.message}` };
    }

    const byKey = new Map<string, string>();
    for (const t of newTeams) {
      byKey.set(`${t.region}-${t.seed}`, t.id as string);
    }

    teamIdMap = new Map<string, string>();
    for (const t of teams) {
      const key = `${t.region}-${t.seed}`;
      const mapped = byKey.get(key);
      if (mapped) {
        teamIdMap.set(t.id as string, mapped);
      }
    }
  }

  const { data: games, error: gamesErr } = await supabase
    .from("tournament_games")
    .select("round, position, region, team1_id, team2_id")
    .eq("tournament_id", sourceTournamentId);

  if (gamesErr) {
    return { success: false, message: `Failed to load games: ${gamesErr.message}` };
  }

  if (games && games.length > 0) {
    const gameRows = games.map((g) => ({
      tournament_id: newTournamentId,
      round: g.round,
      position: g.position,
      region: g.region,
      team1_id: g.team1_id ? teamIdMap.get(g.team1_id as string) ?? null : null,
      team2_id: g.team2_id ? teamIdMap.get(g.team2_id as string) ?? null : null,
      winner_id: null,
    }));

    const { error: insertGamesErr } = await supabase
      .from("tournament_games")
      .insert(gameRows);

    if (insertGamesErr) {
      return { success: false, message: `Failed to duplicate games: ${insertGamesErr.message}` };
    }
  }

  revalidatePath("/admin");
  return {
    success: true,
    message: `Tournament duplicated. New ID: ${newTournamentId}`,
  };
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

  const { data: tournament, error: tournamentErr } = await supabase
    .from("tournaments")
    .select("region_top_left, region_top_right, region_bottom_left, region_bottom_right")
    .eq("id", tournamentId)
    .single();

  if (tournamentErr || !tournament) {
    return { success: false, message: "Tournament not found." };
  }

  const regions = [
    tournament.region_top_left ?? "East",
    tournament.region_top_right ?? "West",
    tournament.region_bottom_left ?? "South",
    tournament.region_bottom_right ?? "Midwest",
  ] as string[];

  // Check if teams already exist
  const { data: existingTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .limit(1);

  if (existingTeams && existingTeams.length > 0) {
    return { success: false, message: "Tournament already has teams. Delete them first." };
  }

  // Insert 64 teams (use default names by quadrant position: first region = East names, etc.)
  const teamRows: { tournament_id: string; name: string; seed: number; region: string }[] = [];
  for (let r = 0; r < regions.length; r++) {
    const region = regions[r];
    const nameTemplate = REGIONS[r];
    for (let seed = 1; seed <= 16; seed++) {
      teamRows.push({
        tournament_id: tournamentId,
        name: DEFAULT_TEAM_NAMES[nameTemplate][seed - 1],
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
  for (const region of regions) {
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
  for (const region of regions) {
    for (let pos = 0; pos < 4; pos++) {
      gameRows.push({ tournament_id: tournamentId, round: 2, position: pos, region, team1_id: null, team2_id: null });
    }
    for (let pos = 0; pos < 2; pos++) {
      gameRows.push({ tournament_id: tournamentId, round: 3, position: pos, region, team1_id: null, team2_id: null });
    }
    gameRows.push({ tournament_id: tournamentId, round: 4, position: 0, region, team1_id: null, team2_id: null });
  }

  // Round 5: Final Four (2 games: position 0 = top_left vs top_right, position 1 = bottom_left vs bottom_right)
  for (let pos = 0; pos < 2; pos++) {
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

// ── Bulk load teams from config (e.g. 2026-teams.json) ──

export interface TeamConfigEntry {
  region: string;
  seed: number;
  name: string;
  icon_url: string | null;
}

export async function bulkUpdateTeamsFromConfigAction(
  tournamentId: string,
  config: TeamConfigEntry[]
): Promise<AdminActionResult> {
  if (!tournamentId || !config?.length) {
    return { success: false, message: "Tournament and config are required." };
  }

  const supabase = await createClient();
  const { data: teams, error: fetchErr } = await supabase
    .from("teams")
    .select("id, region, seed")
    .eq("tournament_id", tournamentId);

  if (fetchErr || !teams?.length) {
    return { success: false, message: fetchErr?.message ?? "No teams found for this tournament." };
  }

  const configKey = (r: string, s: number) => `${r}-${s}`;
  const configByKey = new Map<string, TeamConfigEntry>();
  for (const c of config) {
    configByKey.set(configKey(c.region, c.seed), c);
  }

  let updated = 0;
  for (const t of teams) {
    const entry = configByKey.get(configKey(t.region, t.seed));
    if (!entry) continue;
    const { error } = await supabase
      .from("teams")
      .update({
        name: entry.name.trim(),
        icon_url: entry.icon_url?.trim() || null,
      })
      .eq("id", t.id);
    if (!error) updated++;
  }

  revalidatePath("/admin");
  revalidatePath("/pools");
  revalidatePath("/brackets");
  return { success: true, message: `Updated ${updated} teams from config.` };
}

// ── Pools (admin: list pools + remove players) ──

export interface PoolMemberForAdmin {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  joined_at: string;
}

export interface PoolWithMembersForAdmin {
  id: string;
  name: string;
  invite_code: string;
  creator_id: string;
  member_count: number;
  members: PoolMemberForAdmin[];
}

export async function getPoolsWithMembersForAdminAction(
  tournamentId: string
): Promise<{ pools: PoolWithMembersForAdmin[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { pools: [], error: "Not authenticated." };

  const userInfo = await getUserInfo(supabase, user.id);
  if (!userInfo?.is_site_admin) return { pools: [], error: "Not an admin." };

  const { data: pools, error: poolsErr } = await supabase
    .from("pools")
    .select("id, name, invite_code, creator_id")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (poolsErr || !pools?.length) {
    return { pools: [], error: poolsErr?.message };
  }

  const poolIds = pools.map((p) => p.id);
  const { data: members } = await supabase
    .from("pool_members")
    .select("pool_id, user_id, joined_at")
    .in("pool_id", poolIds)
    .order("joined_at");

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  const { data: userInfos } = await supabase
    .from("user_info")
    .select("id, first_name, last_name, username")
    .in("id", userIds);

  const userMap = new Map<string, { first_name: string | null; last_name: string | null; username: string | null }>();
  for (const u of userInfos ?? []) {
    userMap.set(u.id, {
      first_name: u.first_name ?? null,
      last_name: u.last_name ?? null,
      username: u.username ?? null,
    });
  }

  const membersByPool = new Map<string, typeof members>();
  for (const m of members ?? []) {
    const list = membersByPool.get(m.pool_id) ?? [];
    list.push(m);
    membersByPool.set(m.pool_id, list);
  }

  const result: PoolWithMembersForAdmin[] = pools.map((p) => {
    const poolMembers = membersByPool.get(p.id) ?? [];
    return {
      id: p.id,
      name: p.name,
      invite_code: p.invite_code,
      creator_id: p.creator_id,
      member_count: poolMembers.length,
      members: poolMembers.map((m) => {
        const info = userMap.get(m.user_id);
        return {
          user_id: m.user_id,
          first_name: info?.first_name ?? null,
          last_name: info?.last_name ?? null,
          username: info?.username ?? null,
          joined_at: m.joined_at,
        };
      }),
    };
  });

  return { pools: result };
}

export async function adminRemovePoolMemberAction(
  poolId: string,
  memberUserId: string
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Not authenticated." };

  const userInfo = await getUserInfo(supabase, user.id);
  if (!userInfo?.is_site_admin) return { success: false, message: "Not an admin." };

  const result = await removePoolMember(supabase, poolId, memberUserId);
  if (!result.success) return { success: false, message: result.error ?? "Failed to remove member." };

  revalidatePath("/admin");
  revalidatePath("/pools");
  revalidatePath(`/pools/${poolId}`);
  return { success: true, message: "Player removed from pool." };
}
