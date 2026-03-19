import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getPool, getPoolGoodiesWithTypes, getPoolBracketGoodyAnswers } from "@/lib/pools";
import { getTeams, getGames } from "@/lib/tournament";
import Navbar from "../../../_components/navbar";
import GoodyPicksForm from "./_components/goody-picks-form";

export default async function GoodyPicksPage({
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

  const pool = await getPool(supabase, poolId);
  if (!pool) notFound();

  const { data: poolBracketRow } = await supabase
    .from("pool_brackets")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!poolBracketRow) {
    redirect(`/pools/${poolId}${modeParam}`);
  }

  const poolGoodiesWithTypes = await getPoolGoodiesWithTypes(supabase, poolId);
  const userInputGoodies = poolGoodiesWithTypes.filter(
    (pg) => pg.goody_types?.input_type === "user_input"
  );

  if (userInputGoodies.length === 0) {
    redirect(`/pools/${poolId}${modeParam}`);
  }

  const [goodyAnswers, teams, allGames] = await Promise.all([
    getPoolBracketGoodyAnswers(supabase, poolBracketRow.id),
    getTeams(supabase, pool.tournament_id, testMode),
    getGames(supabase, pool.tournament_id, testMode),
  ]);
  const firstRoundGames = allGames.filter((g) => g.round === 1);

  const userInfo = await getUserInfo(supabase, user.id);

  const goodyPicksComplete =
    goodyAnswers.length >= userInputGoodies.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        userEmail={user.email}
        firstName={userInfo?.first_name}
        lastName={userInfo?.last_name}
        avatarUrl={userInfo?.avatar_url}
        activeTab="Pools"
        modeParam={modeParam}
      />
      <main className="pt-20 pb-20 min-h-screen flex justify-center">
        <div className="w-full max-w-md px-4 py-8">
          <Link
            href={`/pools/${poolId}${modeParam}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to {pool.name}
          </Link>

          <section className="mt-6">
            <h1 className="text-2xl font-semibold text-stone-100 mb-2">Goodie Picks</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {goodyPicksComplete
                ? "Update your bonus picks below. You can change these anytime before the tournament."
                : "Fill out your bonus picks for this pool. You can come back and update these anytime before the tournament."}
            </p>

            {!goodyPicksComplete && (
              <div className="card p-4 mb-6 border-amber-500/30 bg-amber-500/5">
                <p className="text-sm font-medium text-amber-200">
                  You haven&apos;t made your Goodie Picks yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete the form below to be eligible for goodie points in this pool.
                </p>
              </div>
            )}

            <GoodyPicksForm
              poolId={poolId}
              modeParam={modeParam}
              userInputGoodies={userInputGoodies}
              existingGoodyAnswers={goodyAnswers}
              teams={teams}
              firstRoundGames={firstRoundGames}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
