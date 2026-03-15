import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getBracket } from "@/lib/brackets";
import { getTeams, getGames, isTournamentLocked, getTournament } from "@/lib/tournament";
import { getPool } from "@/lib/pools";
import Navbar from "../../_components/navbar";
import BracketEditor from "./_components/bracket-editor";

export default async function BracketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id: bracketId } = await params;
  const sp = await searchParams;
  const testMode = sp?.mode === "test";
  const modeParam = testMode ? "?mode=test" : "";
  const poolId = typeof sp?.pool === "string" ? sp.pool : undefined;

  const userInfo = await getUserInfo(supabase, user.id);
  const bracket = await getBracket(supabase, bracketId);
  if (!bracket) notFound();

  const isOwner = bracket.user_id === user.id;

  const tournament = await getTournament(supabase, bracket.tournament_id, testMode);
  const locked = tournament ? isTournamentLocked(tournament) : false;

  const teams = await getTeams(supabase, bracket.tournament_id, testMode);
  const games = await getGames(supabase, bracket.tournament_id, testMode);

  const pool = poolId ? await getPool(supabase, poolId) : null;

  const picksMap: Record<string, string> = {};
  for (const pick of bracket.picks) {
    picksMap[pick.game_id] = pick.picked_team_id;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} username={userInfo?.username} activeTab="Brackets" modeParam={modeParam} />
      <main className="pt-16 min-h-screen">
        <div className="px-4 mb-4">
          <Link
            href={`/brackets${modeParam}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Brackets
          </Link>
        </div>
        <div className="px-2">
          <BracketEditor
            bracketId={bracket.id}
            bracketName={bracket.name}
            teams={teams}
            games={games}
            initialPicks={picksMap}
            locked={locked || !isOwner}
            poolId={pool ? poolId : undefined}
            poolName={pool?.name}
          />
        </div>
      </main>
    </div>
  );
}
