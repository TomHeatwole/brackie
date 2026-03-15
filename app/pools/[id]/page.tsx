import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getPool, getPoolMembers } from "@/lib/pools";
import { getUserBrackets } from "@/lib/brackets";
import Navbar from "../../_components/navbar";
import PoolIcon from "../../_components/pool-icon";
import UserAvatar from "../../_components/user-avatar";
import InviteCodeDisplay from "./_components/invite-code-display";
import SubmitBracketForm from "./_components/submit-bracket-form";

export default async function PoolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id: poolId } = await params;
  const sp = await searchParams;
  const testMode = sp?.mode === "test";
  const modeParam = testMode ? "?mode=test" : "";

  const userInfo = await getUserInfo(supabase, user.id);
  const pool = await getPool(supabase, poolId);
  if (!pool) notFound();

  const members = await getPoolMembers(supabase, poolId);
  const allUserBrackets = await getUserBrackets(supabase, user.id);
  const userBrackets = allUserBrackets.filter(
    (b) => b.tournament_id === pool.tournament_id
  );

  const currentUserPoolBracket = members.find(
    (m) => m.user_id === user.id && m.bracket_submitted
  );

  const { data: poolBracketRow } = await supabase
    .from("pool_brackets")
    .select("bracket_id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isMember = members.some((m) => m.user_id === user.id);
  const isCreator = pool.creator_id === user.id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} username={userInfo?.username} avatarUrl={userInfo?.avatar_url} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 min-h-screen flex justify-center">
        <div className="w-full max-w-2xl px-4">
          <Link
            href={`/pools${modeParam}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Pools
          </Link>

          <div className="mt-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PoolIcon imageUrl={pool.image_url} poolName={pool.name} size="lg" />
                <div>
                  <h1 className="text-2xl font-semibold text-stone-100">{pool.name}</h1>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-muted text-sm">
                      {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
                    </span>
                    {pool.creator_username && (
                      <span className="text-muted text-sm">Created by {pool.creator_username}</span>
                    )}
                  </div>
                </div>
              </div>
              {isCreator && (
                <Link
                  href={`/pools/${poolId}/settings${modeParam}`}
                  className="btn-outline shrink-0"
                >
                  Settings
                </Link>
              )}
            </div>
          </div>

          <div className="card rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-stone-300 mb-1">Invite Code</h2>
                <p className="text-muted text-xs">Share the code or link with friends to invite them</p>
              </div>
              <InviteCodeDisplay code={pool.invite_code} />
            </div>
          </div>

          {isMember && (
            <div className="card rounded-lg p-4 mb-6">
              <h2 className="text-sm font-medium text-stone-300 mb-3">
                {currentUserPoolBracket ? "Your Submitted Bracket" : "Submit a Bracket"}
              </h2>

              {currentUserPoolBracket ? (
                <>
                  <SubmitBracketForm
                    poolId={poolId}
                    brackets={userBrackets}
                    currentBracketId={poolBracketRow?.bracket_id}
                  />
                  <Link
                    href={`/brackets/create${modeParam ? modeParam + "&" : "?"}pool=${poolId}`}
                    className="mt-3 inline-block text-sm text-accent hover:underline"
                  >
                    Make new picks &rarr;
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={`/brackets/create${modeParam ? modeParam + "&" : "?"}pool=${poolId}`}
                    className="btn-primary w-full text-center block py-3 text-base font-medium"
                  >
                    Make your picks
                  </Link>
                  {userBrackets.length > 0 && (
                    <div className="mt-4">
                      <p className="text-muted text-xs mb-2">Or choose an existing bracket</p>
                      <SubmitBracketForm
                        poolId={poolId}
                        brackets={userBrackets}
                        currentBracketId={poolBracketRow?.bracket_id}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="rounded-lg overflow-hidden border border-card-border">
            <div className="px-4 py-3 bg-card">
              <h2 className="text-sm font-medium text-stone-300">Members</h2>
            </div>
            <div className="divide-y divide-card-border">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="px-4 py-3 flex items-center justify-between bg-background"
                >
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      avatarUrl={member.avatar_url}
                      username={member.username}
                      size="sm"
                    />
                    <span className="text-stone-200 text-sm">
                      {member.username ?? member.first_name ?? "Anonymous"}
                    </span>
                    {member.user_id === pool.creator_id && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-card-border text-muted-foreground">
                        Creator
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {member.bracket_submitted ? (
                      member.bracket_id ? (
                        <Link
                          href={`/brackets/${member.bracket_id}${modeParam}`}
                          className="text-xs text-green-400 hover:text-green-300 hover:underline transition-colors"
                        >
                          {member.bracket_name ?? "Bracket submitted"}
                        </Link>
                      ) : (
                        <span className="text-xs text-green-400">
                          {member.bracket_name ?? "Bracket submitted"}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-stone-600">No bracket</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
