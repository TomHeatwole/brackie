import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import Navbar from "../../_components/navbar";
import CreateBracketForm from "./_components/create-bracket-form";

function buildQuerySuffix(params: Record<string, string | string[] | undefined>): string {
  const mode = params.mode;
  const tournamentUpper = params.tournament_ID;
  const tournamentLower = params.tournament_id;
  const tournament =
    (Array.isArray(tournamentUpper) ? tournamentUpper[0] : tournamentUpper) ??
    (Array.isArray(tournamentLower) ? tournamentLower[0] : tournamentLower) ??
    "";
  const parts: string[] = [];

  if (mode === "test") {
    parts.push("mode=test");
  }

  if (tournament) {
    parts.push(`tournament_id=${encodeURIComponent(tournament)}`);
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export default async function CreateBracketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userInfo = await getUserInfo(supabase, user.id);
  const params = await searchParams;
  const querySuffix = buildQuerySuffix(params);
  const testMode = params?.mode === "test";
  const poolId = typeof params?.pool === "string" ? params.pool : undefined;
  const tournamentIdOverrideParam =
    (Array.isArray(params?.tournament_ID) ? params.tournament_ID[0] : params?.tournament_ID) ??
    (Array.isArray(params?.tournament_id) ? params.tournament_id[0] : params?.tournament_id) ??
    undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} activeTab="Brackets" modeParam={querySuffix} />
      <main className="pt-20 pb-20 md:pb-8 min-h-screen flex flex-col items-center">
        <div className="w-full max-w-md px-4">
          <Link
            href={`/brackets${querySuffix}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Brackets
          </Link>
          <h1 className="text-2xl font-semibold text-stone-100 mb-8 mt-4 text-center">Create a Bracket</h1>
          <CreateBracketForm
            testMode={testMode}
            poolId={poolId}
            tournamentIdOverride={tournamentIdOverrideParam}
          />
        </div>
      </main>
    </div>
  );
}
