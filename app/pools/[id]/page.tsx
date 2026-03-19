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
  getPoolHallOfFame,
} from "@/lib/pools";
import { getUserBrackets } from "@/lib/brackets";
import { getTournament, resolveEffectiveTournamentId, parseTournamentOverride } from "@/lib/tournament";
import { buildPoolScoringContext, scoreBracketsForPool } from "@/lib/scoring";
import { formatUserDisplayName } from "@/utils/display-name";
import Navbar from "../../_components/navbar";
import PoolIcon from "../../_components/pool-icon";
import UserAvatar from "../../_components/user-avatar";
import InviteCodeDisplay from "./_components/invite-code-display";
import PoolScoringDisplay from "./_components/pool-scoring-display";
import PoolTabs from "./_components/pool-tabs";
import SubmitBracketForm from "./_components/submit-bracket-form";
import RemoveMemberButton from "./_components/remove-member-button";

type ProgressStatus = "none" | "half" | "full";

function MemberProgressIndicator({
  status,
  hasBracket,
  hasGoodies,
}: {
  status: ProgressStatus;
  hasBracket: boolean;
  hasGoodies: boolean;
}) {
  const strokeWidth = 3;
  const radius = 8 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const getDashOffset = () => {
    if (status === "none") return circumference;
    if (status === "half") return circumference / 2;
    return 0;
  };

  const hasProgress = status !== "none";

  const ariaLabelParts: string[] = [];
  ariaLabelParts.push(hasBracket ? "Bracket submitted" : "Bracket not submitted");
  ariaLabelParts.push(hasGoodies ? "Goodies completed" : "Goodies not completed");
  const ariaLabel = ariaLabelParts.join(", ");

  return (
    <div className="relative inline-flex shrink-0 group" aria-label={ariaLabel}>
      <svg width="16" height="16" viewBox="0 0 16 16" className="block">
        <circle
          cx="8"
          cy="8"
          r={radius}
          stroke={hasProgress ? "#334155" : "#4b5563"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {hasProgress && (
          <circle
            cx="8"
            cy="8"
            r={radius}
            stroke={status === "full" ? "#4ade80" : "#22c55e"}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={getDashOffset()}
            strokeLinecap="round"
            transform="rotate(-90 8 8)"
          />
        )}
      </svg>
      <div className="pointer-events-none absolute -top-12 left-1/2 z-20 w-max max-w-xs -translate-x-1/2 rounded-md border border-emerald-500/60 bg-stone-900/95 px-2.5 py-1.5 text-[11px] text-stone-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold ${
                hasBracket
                  ? "bg-emerald-500 text-stone-950"
                  : "bg-amber-400 text-stone-950"
              }`}
            >
              {hasBracket ? "✓" : "!"}
            </span>
            <span>
              <span className="font-semibold">Bracket:</span>{" "}
              {hasBracket ? "Submitted" : "Not submitted"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold ${
                hasGoodies
                  ? "bg-emerald-500 text-stone-950"
                  : "bg-amber-400 text-stone-950"
              }`}
            >
              {hasGoodies ? "✓" : "!"}
            </span>
            <span>
              <span className="font-semibold">Goodies:</span>{" "}
              {hasGoodies ? "Completed" : "Not completed"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const overrideId = parseTournamentOverride(sp);
  const effectiveTournamentId =
    overrideId ??
    (await resolveEffectiveTournamentId(supabase, {
      searchParams: sp,
      fallbackTournamentId: pool.tournament_id,
    })) ??
    pool.tournament_id;

  const members = await getPoolMembers(supabase, poolId);
  const allUserBrackets = await getUserBrackets(supabase, user.id);
  const userBrackets = allUserBrackets.filter(
    (b) => b.tournament_id === effectiveTournamentId
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

  const [poolGoodiesWithTypes, tournament, hallOfFame] = await Promise.all([
    getPoolGoodiesWithTypes(supabase, poolId),
    getTournament(supabase, effectiveTournamentId, testMode),
    getPoolHallOfFame(supabase, poolId),
  ]);
  const userInputGoodies = poolGoodiesWithTypes.filter(
    (pg) => pg.goody_types?.input_type === "user_input"
  );
  const hasSelectableGoodiesForPool =
    pool.goodies_enabled && userInputGoodies.length > 0;

  const goodyAnswers =
    poolBracketRow && userInputGoodies.length > 0
      ? await getPoolBracketGoodyAnswers(supabase, poolBracketRow.id)
      : [];
  const goodyPicksComplete =
    userInputGoodies.length > 0 && goodyAnswers.length >= userInputGoodies.length;

  const isActive = tournament?.status === "active" || tournament?.status === "completed";
  const isMember = members.some((m) => m.user_id === user.id);
  const isCreator = pool.creator_id === user.id;

  const { data: allGoodyAnswersRaw } = await supabase
    .from("pool_bracket_goody_answers")
    .select("goody_type_id, value, pool_brackets!inner(user_id, pool_id)")
    .eq("pool_brackets.pool_id", poolId);

  const allGoodyAnswers =
    allGoodyAnswersRaw?.map(
      (row: {
        goody_type_id: string;
        value: Record<string, unknown> | null;
        pool_brackets: { user_id: string; pool_id: string };
      }) => ({
        userId: row.pool_brackets.user_id,
        goodyTypeId: row.goody_type_id,
        value: row.value ?? null,
      })
    ) ?? [];

  const scoringContext = isActive
    ? await buildPoolScoringContext(supabase, pool, { testMode })
    : null;
  const poolScores = scoringContext ? scoreBracketsForPool(scoringContext) : [];
  const activeTeams = scoringContext?.teams ?? [];
  const activeGames = scoringContext?.games ?? [];
  const bracketPicks = (scoringContext?.brackets ?? []).map((b) => ({
    bracketId: b.id,
    userId: b.user_id,
    picks: b.picks.map((p) => ({ game_id: p.game_id, picked_team_id: p.picked_team_id })),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 pb-20 md:pb-8 min-h-screen flex justify-center">
        <div
          className={
            isActive
              ? "w-full max-w-screen-2xl px-4 md:px-6"
              : "w-full max-w-2xl px-4"
          }
        >
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

          {isActive ? (
            <PoolTabs
              pool={pool}
              poolId={poolId}
              members={members}
              poolGoodiesWithTypes={poolGoodiesWithTypes}
              isCreator={isCreator}
              modeParam={modeParam}
              scores={poolScores}
              goodyAnswers={allGoodyAnswers}
              teams={activeTeams}
              games={activeGames}
              bracketPicks={bracketPicks}
              hallOfFame={hallOfFame}
            />
          ) : (
            <>
              <PoolScoringDisplay pool={pool} poolGoodiesWithTypes={poolGoodiesWithTypes} />
              {hallOfFame.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-card-border mt-4">
                  <div className="px-4 py-3 bg-card flex items-center justify-between">
                    <h2 className="text-sm font-medium text-stone-300">Hall of Fame</h2>
                  </div>
                  <div className="overflow-x-auto bg-background">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-card-border">
                          <th className="text-left px-3 py-2 text-stone-400 font-medium">Year</th>
                          <th className="text-left px-3 py-2 text-amber-400 font-medium">1st</th>
                          <th className="text-left px-3 py-2 text-stone-400 font-medium">2nd</th>
                          <th className="text-left px-3 py-2 text-stone-500 font-medium">3rd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hallOfFame.map((entry) => (
                          <tr key={entry.id} className="border-b border-card-border/50 last:border-b-0">
                            <td className="px-3 py-2 text-stone-100 font-semibold tabular-nums">{entry.year}</td>
                            <td className="px-3 py-2 text-stone-100">{entry.first_place}</td>
                            <td className="px-3 py-2 text-stone-300">{entry.second_place}</td>
                            <td className="px-3 py-2 text-stone-400">{entry.third_place ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!isActive && !isMember && (
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
                    modeParam={modeParam}
                    hasSelectableGoodies={hasSelectableGoodiesForPool}
                    poolName={pool.name}
                  />
                  {poolBracketRow?.bracket_id && (
                    <Link
                      href={`/brackets/${poolBracketRow.bracket_id}${modeParam ? modeParam + "&" : "?"}pool=${poolId}`}
                      className="mt-3 btn-outline w-full text-center block py-3 text-base font-medium"
                    >
                      Edit picks
                    </Link>
                  )}
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
                        modeParam={modeParam}
                        hasSelectableGoodies={hasSelectableGoodiesForPool}
                        poolName={pool.name}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!isActive && isMember && currentUserPoolBracket && userInputGoodies.length > 0 && (
            <div className="card p-4 mb-6">
              <h2 className="text-sm font-medium text-stone-300 mb-1">Goodie Picks</h2>
              {goodyPicksComplete ? (
                <>
                  <p className="text-muted text-xs mb-4">
                    Your bonus picks are set. You can update them anytime before the tournament.
                  </p>
                  <Link
                    href={`/pools/${poolId}/goody-picks${modeParam}`}
                    className="btn-outline w-full text-center block py-3 text-base font-medium"
                  >
                    Edit Goodie Picks
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-muted text-xs mb-4">
                    You haven&apos;t made your Goodie Picks yet. Add bonus picks to compete for extra points in this pool.
                  </p>
                  <Link
                    href={`/pools/${poolId}/goody-picks${modeParam}`}
                    className="btn-primary w-full text-center block py-3 text-base font-medium"
                  >
                    Make Goodie Picks
                  </Link>
                </>
              )}
            </div>
          )}

          {!isActive && (
            <div className="rounded-lg overflow-hidden border border-card-border mt-4">
              <div className="px-4 py-3 bg-card flex items-center justify-between">
                <h2 className="text-sm font-medium text-stone-300">Members</h2>
              </div>
              <div className="divide-y divide-card-border">
                {members.map((member) => {
                  const showProgress = hasSelectableGoodiesForPool;

                  const hasBracket = !!member.bracket_submitted;
                  const hasGoodies = !!member.goodies_complete;

                  let progressStatus: ProgressStatus = "none";
                  if (showProgress) {
                    if (hasBracket && hasGoodies) {
                      progressStatus = "full";
                    } else if (hasBracket || hasGoodies) {
                      progressStatus = "half";
                    } else {
                      progressStatus = "none";
                    }
                  }

                  return (
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
                        {showProgress && (
                          <div className="ml-1">
                            <MemberProgressIndicator
                              status={progressStatus}
                              hasBracket={hasBracket}
                              hasGoodies={hasGoodies}
                            />
                          </div>
                        )}
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
                              href={`/brackets/${member.bracket_id}${modeParam ? modeParam + "&" : "?"}pool=${poolId}`}
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
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
