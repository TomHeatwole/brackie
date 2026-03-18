import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getGoodyTypes } from "@/lib/goodies";
import Navbar from "../../_components/navbar";
import CreatePoolForm from "./_components/create-pool-form";

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

export default async function CreatePoolPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userInfo = await getUserInfo(supabase, user.id);
  const goodyTypes = await getGoodyTypes(supabase);
  const params = await searchParams;
  const querySuffix = buildQuerySuffix(params);
  const testMode = params?.mode === "test";
  const tournamentIdOverrideParam =
    (Array.isArray(params?.tournament_ID) ? params.tournament_ID[0] : params?.tournament_ID) ??
    (Array.isArray(params?.tournament_id) ? params.tournament_id[0] : params?.tournament_id) ??
    undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} activeTab="Pools" modeParam={querySuffix} />
      <main className="pt-20 min-h-screen flex flex-col items-center pb-24">
        <div className="w-full max-w-md px-4 py-8">
          <Link
            href={`/pools${querySuffix}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Pools
          </Link>
          <h1 className="text-2xl font-semibold text-stone-100 mb-2 mt-4">Create a Pool</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Set your pool name and scoring rules. You can change scoring later in Settings.
          </p>
          <div className="card rounded-xl p-6">
            <CreatePoolForm
              testMode={testMode}
              goodyTypes={goodyTypes}
              tournamentIdOverride={tournamentIdOverrideParam}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
