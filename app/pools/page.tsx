import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getUserPools } from "@/lib/pools";
import Navbar from "../_components/navbar";
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
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} username={userInfo?.username} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 min-h-screen flex justify-center">
        <div className="w-full max-w-2xl px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-stone-100">Your Pools</h1>
            <Link
              href={`/pools/create${modeParam}`}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#AE4E02" }}
            >
              Create a Pool
            </Link>
          </div>

          <div className="mb-8 rounded-lg p-4" style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}>
            <h2 className="text-sm font-medium text-stone-300 mb-3">Join a Pool</h2>
            <JoinPoolForm testMode={testMode} />
          </div>

          {pools.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-500 text-sm">You haven&apos;t joined any pools yet.</p>
              <p className="text-stone-600 text-xs mt-2">Create one or enter an invite code above to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pools.map((pool) => (
                <Link
                  key={pool.id}
                  href={`/pools/${pool.id}${modeParam}`}
                  className="rounded-lg p-4 transition-colors hover:border-stone-600"
                  style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-stone-100 font-medium">{pool.name}</h3>
                      <p className="text-stone-500 text-xs mt-1">
                        {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
                        {pool.creator_username && <> &middot; Created by {pool.creator_username}</>}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-stone-400 tracking-wider">{pool.invite_code}</span>
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
