import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getUserPools } from "@/lib/pools";
import { formatUserDisplayName } from "@/utils/display-name";
import Navbar from "../_components/navbar";
import PoolIcon from "../_components/pool-icon";
import JoinPoolForm from "./_components/join-pool-form";

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userInfo = await getUserInfo(supabase, user.id);
  const params = await searchParams;
  const testMode = params?.mode === "test";
  const modeParam = testMode ? "?mode=test" : "";

  const pools = await getUserPools(supabase, user.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 pb-20 md:pb-8 min-h-screen flex justify-center">
        <div className="w-full max-w-2xl px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-stone-100">Your Pools</h1>
            <Link href={`/pools/create${modeParam}`} className="btn-primary">
              Create a Pool
            </Link>
          </div>

          <div className="card mb-8 p-4">
            <h2 className="text-sm font-medium text-stone-300 mb-3">Join a Pool</h2>
            <JoinPoolForm testMode={testMode} />
          </div>

          {pools.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-20">🏆</div>
              <p className="text-muted-foreground text-sm">You haven&apos;t joined any pools yet.</p>
              <p className="text-muted text-xs mt-2">Create one or enter an invite code above to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pools.map((pool) => (
                <Link
                  key={pool.id}
                  href={`/pools/${pool.id}${modeParam}`}
                  className="card p-4"
                >
                  <div className="flex items-center gap-3">
                    <PoolIcon imageUrl={pool.image_url} poolName={pool.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-stone-100 font-medium truncate">{pool.name}</h3>
                        <span className="text-xs font-mono text-muted-foreground tracking-wider shrink-0 ml-2">{pool.invite_code}</span>
                      </div>
                      <p className="text-muted text-xs mt-0.5">
                        {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
                        {formatUserDisplayName(pool.creator_first_name, pool.creator_last_name) && <> &middot; Created by {formatUserDisplayName(pool.creator_first_name, pool.creator_last_name)}</>}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
