import { SupabaseClient } from "@supabase/supabase-js";
import {
  Pool,
  PoolWithDetails,
  PoolMemberWithInfo,
  PoolGoody,
  PoolBracketGoodyAnswer,
  HallOfFameEntry,
  RoundPoints,
  UpsetMultipliers,
  GoodyScoringMode,
  GoodyScoringConfig,
  DEFAULT_ROUND_POINTS,
  DEFAULT_UPSET_MULTIPLIERS,
} from "./types";
import { HIDDEN_GOODY_KEYS, goodyDisplayOrder } from "./goodies";

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getUserPools(
  supabase: SupabaseClient,
  userId: string
): Promise<PoolWithDetails[]> {
  const { data: memberships } = await supabase
    .from("pool_members")
    .select("pool_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const poolIds = memberships.map((m: { pool_id: string }) => m.pool_id);

  const { data: pools } = await supabase
    .from("pools")
    .select("*")
    .in("id", poolIds)
    .order("created_at", { ascending: false });

  if (!pools || pools.length === 0) return [];

  const [{ data: members1 }, { data: members2 }] = await Promise.all([
    supabase.from("pool_members").select("pool_id").in("pool_id", poolIds).range(0, 999),
    supabase.from("pool_members").select("pool_id").in("pool_id", poolIds).range(1000, 1999),
  ]);
  const allMembers = [...(members1 ?? []), ...(members2 ?? [])];

  const memberCounts = new Map<string, number>();
  for (const m of allMembers ?? []) {
    memberCounts.set(m.pool_id, (memberCounts.get(m.pool_id) ?? 0) + 1);
  }

  const creatorIds = [...new Set(pools.map((p: Pool) => p.creator_id))];
  const { data: creators } = await supabase
    .from("user_info")
    .select("id, first_name, last_name")
    .in("id", creatorIds);

  const creatorMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  for (const c of creators ?? []) {
    creatorMap.set(c.id, {
      first_name: c.first_name ?? null,
      last_name: c.last_name ?? null,
    });
  }

  return pools.map((p: Pool) => {
    const creator = creatorMap.get(p.creator_id);
    return {
      ...p,
      member_count: memberCounts.get(p.id) ?? 0,
      creator_first_name: creator?.first_name ?? null,
      creator_last_name: creator?.last_name ?? null,
    };
  });
}

export async function getPool(
  supabase: SupabaseClient,
  poolId: string
): Promise<PoolWithDetails | null> {
  const { data: pool } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (!pool) return null;

  const { data: members } = await supabase
    .from("pool_members")
    .select("pool_id")
    .eq("pool_id", poolId);

  const { data: creator } = await supabase
    .from("user_info")
    .select("first_name, last_name")
    .eq("id", pool.creator_id)
    .single();

  return {
    ...pool,
    member_count: members?.length ?? 0,
    creator_first_name: creator?.first_name ?? null,
    creator_last_name: creator?.last_name ?? null,
  };
}

export async function getPoolMembers(
  supabase: SupabaseClient,
  poolId: string
): Promise<PoolMemberWithInfo[]> {
  const { data: members } = await supabase
    .from("pool_members")
    .select("*")
    .eq("pool_id", poolId)
    .order("joined_at");

  if (!members || members.length === 0) return [];

  const userIds = members.map((m: { user_id: string }) => m.user_id);

  const [{ data: userInfos1 }, { data: userInfos2 }] = await Promise.all([
    supabase.from("user_info").select("id, username, first_name, last_name, avatar_url").in("id", userIds).range(0, 999),
    supabase.from("user_info").select("id, username, first_name, last_name, avatar_url").in("id", userIds).range(1000, 1999),
  ]);
  const userInfos = [...(userInfos1 ?? []), ...(userInfos2 ?? [])];

  const { data: poolBrackets } = await supabase
    .from("pool_brackets")
    .select("user_id, bracket_id, goodies_complete")
    .eq("pool_id", poolId);

  const { data: brackets } = poolBrackets?.length
    ? await supabase
        .from("brackets")
        .select("id, name")
        .in(
          "id",
          poolBrackets.map((pb: { bracket_id: string }) => pb.bracket_id)
        )
    : { data: [] };

  const userInfoMap = new Map<string, { username?: string; first_name?: string; last_name?: string; avatar_url?: string | null }>();
  for (const u of userInfos ?? []) {
    userInfoMap.set(u.id, u);
  }

  const bracketInfoMap = new Map<string, { name: string; id: string }>();
  const goodiesCompleteUserIds = new Set<string>();
  for (const pb of poolBrackets ?? []) {
    const bracket = brackets?.find((b: { id: string; name: string }) => b.id === pb.bracket_id);
    if (bracket) bracketInfoMap.set(pb.user_id, { name: bracket.name, id: bracket.id });
    if ((pb as { goodies_complete?: boolean }).goodies_complete) {
      goodiesCompleteUserIds.add(pb.user_id);
    }
  }

  const poolBracketUserIds = new Set((poolBrackets ?? []).map((pb: { user_id: string }) => pb.user_id));

  return members.map((m: { id: string; pool_id: string; user_id: string; joined_at: string }) => {
    const info = userInfoMap.get(m.user_id);
    const bracketInfo = bracketInfoMap.get(m.user_id);
    return {
      ...m,
      username: info?.username ?? undefined,
      first_name: info?.first_name ?? undefined,
      last_name: info?.last_name ?? undefined,
      avatar_url: info?.avatar_url ?? null,
      bracket_submitted: poolBracketUserIds.has(m.user_id),
      bracket_name: bracketInfo?.name,
      bracket_id: bracketInfo?.id,
      goodies_complete: goodiesCompleteUserIds.has(m.user_id),
    };
  });
}

export interface ScoringSettings {
  round_points?: RoundPoints;
  upset_points_enabled?: boolean;
  upset_multipliers?: UpsetMultipliers;
  goodies_enabled?: boolean;
}

export async function createPool(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  tournamentId: string,
  scoring?: ScoringSettings,
  imageUrl?: string | null
): Promise<Pool | null> {
  const inviteCode = generateInviteCode();

  const { data: pool, error } = await supabase
    .from("pools")
    .insert({
      name,
      creator_id: userId,
      tournament_id: tournamentId,
      invite_code: inviteCode,
      round_points: scoring?.round_points ?? DEFAULT_ROUND_POINTS,
      upset_points_enabled: scoring?.upset_points_enabled ?? true,
      upset_multipliers: scoring?.upset_multipliers ?? DEFAULT_UPSET_MULTIPLIERS,
      goodies_enabled: scoring?.goodies_enabled ?? false,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating pool:", error);
    return null;
  }

  await supabase.from("pool_members").insert({
    pool_id: pool.id,
    user_id: userId,
  });

  return pool;
}

export async function updatePoolDetails(
  supabase: SupabaseClient,
  poolId: string,
  details: { name?: string; image_url?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const update: Record<string, unknown> = {};
  if (details.name !== undefined) update.name = details.name;
  if (details.image_url !== undefined) update.image_url = details.image_url;

  if (Object.keys(update).length === 0) return { success: true };

  const { error } = await supabase
    .from("pools")
    .update(update)
    .eq("id", poolId);

  if (error) {
    console.error("Error updating pool details:", error);
    return { success: false, error: "Failed to update pool details." };
  }

  return { success: true };
}

export async function updatePoolScoringSettings(
  supabase: SupabaseClient,
  poolId: string,
  scoring: ScoringSettings
): Promise<{ success: boolean; error?: string }> {
  const update: Record<string, unknown> = {};
  if (scoring.round_points !== undefined) update.round_points = scoring.round_points;
  if (scoring.upset_points_enabled !== undefined) update.upset_points_enabled = scoring.upset_points_enabled;
  if (scoring.upset_multipliers !== undefined) update.upset_multipliers = scoring.upset_multipliers;
  if (scoring.goodies_enabled !== undefined) update.goodies_enabled = scoring.goodies_enabled;

  const { error } = await supabase
    .from("pools")
    .update(update)
    .eq("id", poolId);

  if (error) {
    console.error("Error updating pool scoring settings:", error);
    return { success: false, error: "Failed to update scoring settings." };
  }

  return { success: true };
}

export async function deletePool(
  supabase: SupabaseClient,
  poolId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("pools")
    .delete()
    .eq("id", poolId);

  if (error) {
    console.error("Error deleting pool:", error);
    return { success: false, error: "Failed to delete pool." };
  }

  return { success: true };
}

export async function getPoolGoodies(
  supabase: SupabaseClient,
  poolId: string
): Promise<PoolGoody[]> {
  const { data } = await supabase
    .from("pool_goodies")
    .select("*")
    .eq("pool_id", poolId);

  return data ?? [];
}

export interface SetPoolGoodyInput {
  goody_type_id: string;
  points: number;
  stroke_rule_enabled: boolean;
  scoring_mode?: GoodyScoringMode;
  scoring_config?: GoodyScoringConfig | null;
}

export async function setPoolGoodies(
  supabase: SupabaseClient,
  poolId: string,
  goodies: SetPoolGoodyInput[]
): Promise<{ success: boolean; error?: string }> {
  const { error: deleteError } = await supabase
    .from("pool_goodies")
    .delete()
    .eq("pool_id", poolId);

  if (deleteError) {
    console.error("Error clearing pool goodies:", deleteError);
    return { success: false, error: "Failed to update goodies." };
  }

  if (goodies.length === 0) return { success: true };

  const rows = goodies.map((g) => ({
    pool_id: poolId,
    goody_type_id: g.goody_type_id,
    points: g.points,
    stroke_rule_enabled: g.stroke_rule_enabled ?? false,
    scoring_mode: g.scoring_mode ?? "fixed",
    scoring_config: g.scoring_config ?? null,
  }));

  const { error: insertError } = await supabase
    .from("pool_goodies")
    .insert(rows);

  if (insertError) {
    console.error("Error inserting pool goodies:", insertError);
    return { success: false, error: "Failed to update goodies." };
  }

  return { success: true };
}

/** Pool goodie with joined goodie type (for knowing input_type). */
export interface PoolGoodyWithType extends PoolGoody {
  goody_types: GoodyTypeRow | null;
}

interface GoodyTypeRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  default_points: number;
  input_type: string;
  config: Record<string, unknown> | null;
}

export async function getPoolGoodiesWithTypes(
  supabase: SupabaseClient,
  poolId: string
): Promise<PoolGoodyWithType[]> {
  const { data } = await supabase
    .from("pool_goodies")
    .select("*, goody_types(*)")
    .eq("pool_id", poolId);

  if (!data) return [];

  return data
    .map((row: PoolGoody & { goody_types: GoodyTypeRow | null }) => ({
      ...row,
      goody_types: row.goody_types ?? null,
    }))
    .filter((pg) => !HIDDEN_GOODY_KEYS.includes(pg.goody_types?.key ?? ""))
    .sort((a, b) =>
      goodyDisplayOrder(a.goody_types?.key ?? "") - goodyDisplayOrder(b.goody_types?.key ?? "")
    );
}

export async function joinPool(
  supabase: SupabaseClient,
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; poolId?: string; error?: string }> {
  const { data: pool } = await supabase
    .from("pools")
    .select("id")
    .eq("invite_code", inviteCode.toUpperCase().trim())
    .single();

  if (!pool) {
    return { success: false, error: "Invalid invite code" };
  }

  const { data: existing } = await supabase
    .from("pool_members")
    .select("id")
    .eq("pool_id", pool.id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return { success: false, error: "You are already a member of this pool", poolId: pool.id };
  }

  const { error } = await supabase.from("pool_members").insert({
    pool_id: pool.id,
    user_id: userId,
  });

  if (error) {
    console.error("Error joining pool:", error);
    return { success: false, error: "Failed to join pool" };
  }

  return { success: true, poolId: pool.id };
}

/** Remove a member from a pool. Caller must be the pool creator or site admin (enforced by RLS). Also removes their bracket from the pool. */
export async function removePoolMember(
  supabase: SupabaseClient,
  poolId: string,
  memberUserId: string
): Promise<{ success: boolean; error?: string }> {
  const { error: bracketError } = await supabase
    .from("pool_brackets")
    .delete()
    .eq("pool_id", poolId)
    .eq("user_id", memberUserId);

  if (bracketError) {
    console.error("Error removing member bracket from pool:", bracketError);
    return { success: false, error: "Failed to remove member from pool." };
  }

  const { error: memberError } = await supabase
    .from("pool_members")
    .delete()
    .eq("pool_id", poolId)
    .eq("user_id", memberUserId);

  if (memberError) {
    console.error("Error removing pool member:", memberError);
    return { success: false, error: "Failed to remove member from pool." };
  }

  return { success: true };
}

export async function submitBracketToPool(
  supabase: SupabaseClient,
  poolId: string,
  bracketId: string,
  userId: string
): Promise<{ success: boolean; pool_bracket_id?: string; error?: string }> {
  const { data: pool } = await supabase
    .from("pools")
    .select("tournament_id")
    .eq("id", poolId)
    .single();

  const { data: bracket } = await supabase
    .from("brackets")
    .select("tournament_id")
    .eq("id", bracketId)
    .single();

  if (pool && bracket && pool.tournament_id !== bracket.tournament_id) {
    return { success: false, error: "Bracket is for a different tournament." };
  }

  const { data: existing } = await supabase
    .from("pool_brackets")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("pool_brackets")
      .update({ bracket_id: bracketId })
      .eq("id", existing.id);

    if (error) {
      return { success: false, error: "Failed to update bracket submission" };
    }
    return { success: true, pool_bracket_id: existing.id };
  }

  const { data: inserted, error } = await supabase
    .from("pool_brackets")
    .insert({
      pool_id: poolId,
      bracket_id: bracketId,
      user_id: userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error submitting bracket to pool:", error);
    return { success: false, error: "Failed to submit bracket" };
  }

  return { success: true, pool_bracket_id: inserted?.id };
}

export async function getPoolBracketGoodyAnswers(
  supabase: SupabaseClient,
  poolBracketId: string
): Promise<PoolBracketGoodyAnswer[]> {
  const { data } = await supabase
    .from("pool_bracket_goody_answers")
    .select("*")
    .eq("pool_bracket_id", poolBracketId);
  return data ?? [];
}

export async function getPoolHallOfFame(
  supabase: SupabaseClient,
  poolId: string
): Promise<HallOfFameEntry[]> {
  const { data } = await supabase
    .from("pool_hall_of_fame")
    .select("*")
    .eq("pool_id", poolId)
    .order("year", { ascending: false });

  return data ?? [];
}

export async function setPoolBracketGoodyAnswers(
  supabase: SupabaseClient,
  poolBracketId: string,
  answers: { goody_type_id: string; value: Record<string, unknown> }[]
): Promise<{ success: boolean; error?: string }> {
  const { error: deleteError } = await supabase
    .from("pool_bracket_goody_answers")
    .delete()
    .eq("pool_bracket_id", poolBracketId);

  if (deleteError) {
    console.error("Error clearing goodie answers:", deleteError);
    return { success: false, error: "Failed to save goodie answers." };
  }

  if (answers.length === 0) return { success: true };

  const rows = answers.map((a) => ({
    pool_bracket_id: poolBracketId,
    goody_type_id: a.goody_type_id,
    value: a.value,
  }));

  const { error: insertError } = await supabase
    .from("pool_bracket_goody_answers")
    .insert(rows);

  if (insertError) {
    console.error("Error inserting goodie answers:", insertError);
    return { success: false, error: "Failed to save goodie answers." };
  }

  // Update goodies_complete flag on pool_brackets so pool members can see who finished goodies
  // without reading individual answers (which are protected by RLS).
  try {
    // Find the pool this bracket belongs to
    const { data: poolBracket } = await supabase
      .from("pool_brackets")
      .select("pool_id")
      .eq("id", poolBracketId)
      .maybeSingle();

    if (poolBracket?.pool_id) {
      // Count how many user-input goodies are configured for this pool
      const { data: poolGoodies } = await supabase
        .from("pool_goodies")
        .select("id, goody_types!inner(input_type)")
        .eq("pool_id", poolBracket.pool_id)
        .eq("goody_types.input_type", "user_input");

      const requiredCount = poolGoodies?.length ?? 0;
      const isComplete = requiredCount > 0 && answers.length >= requiredCount;

      await supabase
        .from("pool_brackets")
        .update({ goodies_complete: isComplete })
        .eq("id", poolBracketId);
    }
  } catch (err) {
    console.error("Error updating goodies_complete flag:", err);
  }

  return { success: true };
}
