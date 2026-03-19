import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getUserBrackets } from "@/lib/brackets";
import { getUserPools } from "@/lib/pools";
import { TOTAL_GAMES } from "@/lib/types";
import Navbar from "./_components/navbar";
import PoolIcon from "./_components/pool-icon";
import TeamIcon from "./_components/team-icon";
import { buildQuerySuffix } from "@/lib/query";
import { getTournament, resolveEffectiveTournamentId } from "@/lib/tournament";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    redirect("/login");
  }
  const params = await searchParams;
  const userInfo = await getUserInfo(supabase, user.id);
  const querySuffix = buildQuerySuffix(params);

  const brackets = await getUserBrackets(supabase, user.id);
  const pools = await getUserPools(supabase, user.id);

  const effectiveTournamentId = await resolveEffectiveTournamentId(supabase, {
    searchParams: params,
  });

  const activeTournament =
    effectiveTournamentId != null
      ? await getTournament(supabase, effectiveTournamentId, params?.mode === "test")
      : null;
  const isActiveOrCompleted =
    activeTournament?.status === "active" || activeTournament?.status === "completed";

  const filteredBrackets =
    effectiveTournamentId != null
      ? brackets.filter((b) => b.tournament_id === effectiveTournamentId)
      : brackets;

  const filteredPools =
    effectiveTournamentId != null
      ? pools.filter((p) => p.tournament_id === effectiveTournamentId)
      : pools;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} activeTab="Dashboard" modeParam={querySuffix} />
      <main className="pt-16 pb-20 md:pb-8 min-h-screen flex justify-center">
        <div className="w-full max-w-5xl flex flex-col md:flex-row">
          {/* Your Brackets */}
          <section className="flex-1 border-b md:border-b-0 md:border-r border-card-border px-4 md:px-8 py-6 md:py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-stone-100">Your Brackets</h2>
              {!isActiveOrCompleted && (
                <Link href={`/brackets/create${querySuffix}`} className="btn-outline">
                  + New
                </Link>
              )}
            </div>

            {filteredBrackets.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3 opacity-20">🏀</div>
                <p className="text-muted-foreground text-sm">
                  {isActiveOrCompleted
                    ? "Bracket creation is closed for this tournament."
                    : "No brackets yet"}
                </p>
                {!isActiveOrCompleted && (
                  <Link
                    href={`/brackets/create${querySuffix}`}
                    className="mt-3 inline-block text-sm text-accent hover:underline"
                  >
                    Create your first bracket &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredBrackets.slice(0, 5).map((bracket) => {
                  const pct = Math.round((bracket.pick_count / TOTAL_GAMES) * 100);
                  return (
                    <Link
                      key={bracket.id}
                      href={`/brackets/${bracket.id}${querySuffix}`}
                      className="card p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-stone-100 text-sm font-medium">{bracket.name}</span>
                      </div>
                      {bracket.champion_name ? (
                        <div className="flex items-center gap-2 mb-2">
                          <TeamIcon
                            team={{
                              name: bracket.champion_name,
                              icon_url: bracket.champion_icon_url ?? null,
                            }}
                            size="xs"
                          />
                          <span className="text-sm font-medium text-accent">
                            ({bracket.champion_seed}) {bracket.champion_name}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic mb-2">No champion picked yet</p>
                      )}
                      <div className="h-1.5 rounded-full overflow-hidden bg-stone-800/60">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct === 100 ? "#4ade80" : "var(--accent)",
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
                {filteredBrackets.length > 5 && (
                  <Link
                    href={`/brackets${querySuffix}`}
                    className="text-sm text-muted hover:text-stone-300 text-center mt-2"
                  >
                    View all {filteredBrackets.length} brackets &rarr;
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Your Pools */}
          <section className="flex-1 px-4 md:px-8 py-6 md:py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-stone-100">Your Pools</h2>
              <div className="flex gap-2">
                {isActiveOrCompleted ? (
                  <Link href={`/pools${querySuffix}`} className="btn-outline">
                    View
                  </Link>
                ) : (
                  <>
                    <Link href={`/pools${querySuffix}`} className="btn-outline">
                      Join
                    </Link>
                    <Link href={`/pools/create${querySuffix}`} className="btn-outline">
                      + New
                    </Link>
                  </>
                )}
              </div>
            </div>

            {filteredPools.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3 opacity-20">🏆</div>
                <p className="text-muted-foreground text-sm">
                  {isActiveOrCompleted
                    ? "Pool creation and joining are closed for this tournament."
                    : "No pools yet"}
                </p>
                {!isActiveOrCompleted && (
                  <Link
                    href={`/pools${querySuffix}`}
                    className="mt-3 inline-block text-sm text-accent hover:underline"
                  >
                    Join or create a pool &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredPools.slice(0, 5).map((pool) => (
                  <Link
                    key={pool.id}
                    href={`/pools/${pool.id}${querySuffix}`}
                    className="card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <PoolIcon imageUrl={pool.image_url} poolName={pool.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-100 text-sm font-medium truncate">{pool.name}</span>
                          <span className="text-xs font-mono text-muted tracking-wider shrink-0 ml-2">{pool.invite_code}</span>
                        </div>
                        <p className="text-muted text-xs mt-0.5">
                          {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
                {filteredPools.length > 5 && (
                  <Link
                    href={`/pools${querySuffix}`}
                    className="text-sm text-muted hover:text-stone-300 text-center mt-2"
                  >
                    View all {filteredPools.length} pools &rarr;
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
