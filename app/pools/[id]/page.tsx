import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import {
  getPool,
  getPoolMembers,
  getPoolGoodiesWithTypes,
  getPoolBracketGoodyAnswers,
} from "@/lib/pools";
import { getUserBrackets } from "@/lib/brackets";
import { getTeams, getGames, getTournament } from "@/lib/tournament";
import { formatUserDisplayName } from "@/utils/display-name";
import Navbar from "../../_components/navbar";
import PoolIcon from "../../_components/pool-icon";
import UserAvatar from "../../_components/user-avatar";
import InviteCodeDisplay from "./_components/invite-code-display";
import PoolScoringDisplay from "./_components/pool-scoring-display";
import SubmitBracketForm from "./_components/submit-bracket-form";
import RemoveMemberButton from "./_components/remove-member-button";

const OG_TITLE = "Join my pool on brackie!";
const SHARE_DESCRIPTION = "Join my pool on brackie!";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "brackie",
    description: SHARE_DESCRIPTION,
    openGraph: {
      title: OG_TITLE,
      description: SHARE_DESCRIPTION,
      images: [{ url: "https://brackie.games/share_logo.png", width: 512, height: 512, alt: "Brackie!" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: OG_TITLE,
      description: SHARE_DESCRIPTION,
      images: ["https://brackie.games/share_logo.png"],
    },
  };
}

export default async function PoolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { id: poolId } = await params;

  const pool = await getPool(supabase, poolId);
  if (!pool) notFound();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-semibold text-stone-100 text-center mb-2">
          Join my pool on Brackie!
        </h1>
        <p className="text-muted text-center mb-6">
          Sign in to join this pool and make your bracket.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/pools/join/${pool.invite_code}`)}`}
          className="btn-primary px-6 py-3 text-base font-medium"
        >
          Sign in to join
        </Link>
      </div>
    );
  }

  const sp = await searchParams;
  const testMode = sp?.mode === "test";
  const modeParam = testMode ? "?mode=test" : "";

  const userInfo = await getUserInfo(supabase, user.id);

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
    .select("id, bracket_id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  const poolGoodiesWithTypes = await getPoolGoodiesWithTypes(supabase, poolId);
  const userInputGoodies = poolGoodiesWithTypes.filter(
    (pg) => pg.goody_types?.input_type === "user_input"
  );
  const goodyAnswers =
    poolBracketRow?.id != null
      ? await getPoolBracketGoodyAnswers(supabase, poolBracketRow.id)
      : [];

  const [tournament, teams, allGames] = await Promise.all([
    getTournament(supabase, pool.tournament_id, testMode),
    getTeams(supabase, pool.tournament_id, testMode),
    getGames(supabase, pool.tournament_id, testMode),
  ]);
  const firstRoundGames = allGames.filter((g) => g.round === 1);

  const isActive = tournament?.status === "active" || tournament?.status === "completed";
  const isMember = members.some((m) => m.user_id === user.id);
  const isCreator = pool.creator_id === user.id;

  // Placeholder scores for active mode (real scoring algorithm later)
  const membersWithScores = members.map((m, i) => ({
    ...m,
    points: (members.length - i) * 12 + (i % 3) * 5,
    possiblePoints: i % 2 === 0 ? 340 + (i % 4) * 20 : 280 - (i % 3) * 15,
  }));
  const sortedByPoints = [...membersWithScores].sort((a, b) => b.points - a.points);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 pb-20 md:pb-8 min-h-screen flex justify-center">
        <div className="w-full max-w-2xl px-4">
          <Link
            href={`/pools${modeParam}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Pools
          </Link>

          <div className="mt-4 mb-8">
            <div className="flex items-start gap-3">
              <PoolIcon imageUrl={pool.image_url} poolName={pool.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-xl sm:text-2xl font-semibold text-stone-100 truncate">{pool.name}</h1>
                  {isCreator && (
                    <Link
                      href={`/pools/${poolId}/settings${modeParam}`}
                      className="btn-outline shrink-0"
                    >
                      Settings
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-muted text-sm">
                  <span>
                    {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
                  </span>
                  {formatUserDisplayName(pool.creator_first_name, pool.creator_last_name) && (
                    <span className="hidden sm:inline">Created by {formatUserDisplayName(pool.creator_first_name, pool.creator_last_name)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <PoolScoringDisplay pool={pool} poolGoodiesWithTypes={poolGoodiesWithTypes} />

          {!isMember && (
            <div className="card p-4 mb-6">
              <h2 className="text-sm font-medium text-stone-300 mb-1">Join this pool</h2>
              <p className="text-muted text-xs mb-4">
                You need to join the pool before you can create or submit a bracket.
              </p>
              <Link
                href={`/pools/join/${pool.invite_code}`}
                className="btn-primary w-full text-center block py-3 text-base font-medium"
              >
                Join pool
              </Link>
            </div>
          )}

          {!isActive && (
            <div className="card p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-stone-300 mb-0.5">Invite Code</h2>
                  <p className="text-muted text-xs">Share the code or link with friends</p>
                </div>
                <InviteCodeDisplay code={pool.invite_code} />
              </div>
            </div>
          )}

          {!isActive && isMember && (
            <div className="card p-4 mb-6">
              <h2 className="text-sm font-medium text-stone-300 mb-3">
                {currentUserPoolBracket ? "Your Submitted Bracket" : "Submit a Bracket"}
              </h2>

              {currentUserPoolBracket ? (
                <>
                  <SubmitBracketForm
                    poolId={poolId}
                    brackets={userBrackets}
                    currentBracketId={poolBracketRow?.bracket_id}
                    userInputGoodies={userInputGoodies}
                    existingGoodyAnswers={goodyAnswers}
                    teams={teams}
                    firstRoundGames={firstRoundGames}
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
                        userInputGoodies={userInputGoodies}
                        existingGoodyAnswers={goodyAnswers}
                        teams={teams}
                        firstRoundGames={firstRoundGames}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="rounded-lg overflow-hidden border border-card-border">
            <div className="px-4 py-3 bg-card flex items-center justify-between">
              <h2 className="text-sm font-medium text-stone-300">
                {isActive ? "Scores" : "Members"}
              </h2>
              {isActive && (
                <span className="text-xs text-stone-500">
                  Points · Possible (remaining)
                </span>
              )}
            </div>
            <div className="divide-y divide-card-border">
              {isActive ? (
                sortedByPoints.map((member, rank) => (
                  <div
                    key={member.id}
                    className="px-4 py-3 flex items-center justify-between bg-background"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-stone-500 font-mono text-sm w-6 shrink-0">
                        {rank + 1}
                      </span>
                      <UserAvatar
                        avatarUrl={member.avatar_url}
                        firstName={member.first_name}
                        lastName={member.last_name}
                        size="sm"
                      />
                      <span className="text-stone-200 text-sm truncate">
                        {formatUserDisplayName(member.first_name, member.last_name) || "Anonymous"}
                      </span>
                      {member.user_id === pool.creator_id && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-card-border text-muted-foreground shrink-0">
                          Creator
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <span className="text-stone-200 font-semibold tabular-nums">
                          {member.points}
                        </span>
                        <span className="text-stone-500 text-xs ml-0.5">pts</span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-sm tabular-nums">
                          {member.possiblePoints}
                        </span>
                        <span className="text-stone-600 text-xs ml-0.5">possible</span>
                      </div>
                      {isCreator && member.user_id !== pool.creator_id && (
                        <RemoveMemberButton
                          poolId={poolId}
                          memberUserId={member.user_id}
                          memberDisplayName={formatUserDisplayName(member.first_name, member.last_name) || "this member"}
                        />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="px-4 py-3 flex items-center justify-between bg-background"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        avatarUrl={member.avatar_url}
                        firstName={member.first_name}
                        lastName={member.last_name}
                        size="sm"
                      />
                      <span className="text-stone-200 text-sm">
                        {formatUserDisplayName(member.first_name, member.last_name) || "Anonymous"}
                      </span>
                      {member.user_id === pool.creator_id && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-card-border text-muted-foreground">
                          Creator
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-right">
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
                      {isCreator && member.user_id !== pool.creator_id && (
                        <RemoveMemberButton
                          poolId={poolId}
                          memberUserId={member.user_id}
                          memberDisplayName={formatUserDisplayName(member.first_name, member.last_name) || "this member"}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
