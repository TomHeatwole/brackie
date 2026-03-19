import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { Tournament } from "@/lib/types";
import Navbar from "../_components/navbar";
import { AdminDashboard } from "./_components/admin-panels";
import { buildQuerySuffix } from "@/lib/query";
import { getActiveTournament } from "@/lib/tournament";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userInfo = await getUserInfo(supabase, user.id);
  if (!userInfo?.is_site_admin) redirect("/");

  const params = await searchParams;
  const querySuffix = buildQuerySuffix(params);

  const [{ data: tournaments }, activeTournament] = await Promise.all([
    supabase.from("tournaments").select("*").order("year", { ascending: false }),
    getActiveTournament(supabase, false),
  ]);

  const tournamentsList = (tournaments as Tournament[]) ?? [];
  const initialTournamentId =
    activeTournament?.id && tournamentsList.find((t) => t.id === activeTournament.id)
      ? activeTournament.id
      : tournamentsList[0]?.id ?? "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        userEmail={user.email}
        firstName={userInfo?.first_name}
        lastName={userInfo?.last_name}
        avatarUrl={userInfo?.avatar_url}
        modeParam={querySuffix}
      />
      <main className="pt-16 pb-20 md:pb-12 flex justify-center">
        <div className="w-full max-w-3xl px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-stone-100">Admin</h1>
            <span className="text-xs font-mono text-stone-600 truncate max-w-[200px]">
              {user.id}
            </span>
          </div>

          <AdminDashboard tournaments={tournamentsList} initialTournamentId={initialTournamentId} />
        </div>
      </main>
    </div>
  );
}
