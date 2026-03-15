import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { Tournament } from "@/lib/types";
import Navbar from "../_components/navbar";
import {
  CreateTournamentPanel,
  TournamentManagerPanel,
  RawTablePanel,
} from "./_components/admin-panels";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userInfo = await getUserInfo(supabase, user.id);
  if (!userInfo?.is_site_admin) redirect("/");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("year", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} />
      <main className="pt-16 pb-12 flex justify-center">
        <div className="w-full max-w-3xl px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-stone-100">Admin</h1>
            <span className="text-xs font-mono text-stone-600 truncate max-w-[200px]">{user.id}</span>
          </div>

          <div className="flex flex-col gap-6">
            <CreateTournamentPanel />
            <TournamentManagerPanel tournaments={(tournaments as Tournament[]) ?? []} />
            <RawTablePanel />
          </div>
        </div>
      </main>
    </div>
  );
}
