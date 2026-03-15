import { SupabaseClient } from "@supabase/supabase-js";
import { Pool, PoolWithDetails, PoolMemberWithInfo } from "./types";

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

  const { data: allMembers } = await supabase
    .from("pool_members")
    .select("pool_id")
    .in("pool_id", poolIds);

  const memberCounts = new Map<string, number>();
  for (const m of allMembers ?? []) {
    memberCounts.set(m.pool_id, (memberCounts.get(m.pool_id) ?? 0) + 1);
  }

  const creatorIds = [...new Set(pools.map((p: Pool) => p.creator_id))];
  const { data: creators } = await supabase
    .from("user_info")
    .select("id, username")
    .in("id", creatorIds);

  const creatorMap = new Map<string, string>();
  for (const c of creators ?? []) {
    if (c.username) creatorMap.set(c.id, c.username);
  }

  return pools.map((p: Pool) => ({
    ...p,
    member_count: memberCounts.get(p.id) ?? 0,
    creator_username: creatorMap.get(p.creator_id),
  }));
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
    .select("username")
    .eq("id", pool.creator_id)
    .single();

  return {
    ...pool,
    member_count: members?.length ?? 0,
    creator_username: creator?.username,
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

  const { data: userInfos } = await supabase
    .from("user_info")
    .select("id, username, first_name, last_name")
    .in("id", userIds);

  const { data: poolBrackets } = await supabase
    .from("pool_brackets")
    .select("user_id, bracket_id")
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

  const userInfoMap = new Map<string, { username?: string; first_name?: string; last_name?: string }>();
  for (const u of userInfos ?? []) {
    userInfoMap.set(u.id, u);
  }

  const bracketMap = new Map<string, string>();
  for (const pb of poolBrackets ?? []) {
    const bracket = brackets?.find((b: { id: string; name: string }) => b.id === pb.bracket_id);
    if (bracket) bracketMap.set(pb.user_id, bracket.name);
  }

  const poolBracketUserIds = new Set((poolBrackets ?? []).map((pb: { user_id: string }) => pb.user_id));

  return members.map((m: { id: string; pool_id: string; user_id: string; joined_at: string }) => {
    const info = userInfoMap.get(m.user_id);
    return {
      ...m,
      username: info?.username ?? undefined,
      first_name: info?.first_name ?? undefined,
      last_name: info?.last_name ?? undefined,
      bracket_submitted: poolBracketUserIds.has(m.user_id),
      bracket_name: bracketMap.get(m.user_id),
    };
  });
}

export async function createPool(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  tournamentId: string
): Promise<Pool | null> {
  const inviteCode = generateInviteCode();

  const { data: pool, error } = await supabase
    .from("pools")
    .insert({
      name,
      creator_id: userId,
      tournament_id: tournamentId,
      invite_code: inviteCode,
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

export async function submitBracketToPool(
  supabase: SupabaseClient,
  poolId: string,
  bracketId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
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
    return { success: true };
  }

  const { error } = await supabase.from("pool_brackets").insert({
    pool_id: poolId,
    bracket_id: bracketId,
    user_id: userId,
  });

  if (error) {
    console.error("Error submitting bracket to pool:", error);
    return { success: false, error: "Failed to submit bracket" };
  }

  return { success: true };
}
