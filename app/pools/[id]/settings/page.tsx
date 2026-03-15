import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getPool, getPoolGoodies } from "@/lib/pools";
import { getGoodyTypes } from "@/lib/goodies";
import Navbar from "../../../_components/navbar";
import PoolSettingsForm from "./_components/pool-settings-form";

export default async function PoolSettingsPage({
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

  if (pool.creator_id !== user.id) {
    redirect(`/pools/${poolId}${modeParam}`);
  }

  const [goodyTypes, poolGoodies] = await Promise.all([
    getGoodyTypes(supabase),
    getPoolGoodies(supabase, poolId),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} username={userInfo?.username} avatarUrl={userInfo?.avatar_url} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 min-h-screen flex justify-center">
        <div className="w-full max-w-md px-4">
          <Link
            href={`/pools/${poolId}${modeParam}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to {pool.name}
          </Link>
          <h1 className="text-2xl font-semibold text-stone-100 mb-8 mt-4 text-center">
            Pool Settings
          </h1>
          <PoolSettingsForm
            poolId={poolId}
            pool={pool}
            goodyTypes={goodyTypes}
            poolGoodies={poolGoodies}
            modeParam={modeParam}
          />
        </div>
      </main>
    </div>
  );
}
