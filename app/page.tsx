import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getUserBrackets } from "@/lib/brackets";
import { getUserPools } from "@/lib/pools";
import { TOTAL_GAMES } from "@/lib/types";
import Navbar from "./_components/navbar";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userInfo = await getUserInfo(supabase, user.id);
  const params = await searchParams;
  const testMode = params?.mode === "test";
  const modeParam = testMode ? "?mode=test" : "";

  const brackets = await getUserBrackets(supabase, user.id);
  const pools = await getUserPools(supabase, user.id);

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} username={userInfo?.username} activeTab="Dashboard" modeParam={modeParam} />
      <main className="pt-16 min-h-screen flex justify-center">
        <div className="w-full max-w-5xl flex flex-col md:flex-row">
          {/* Your Brackets */}
          <section className="flex-1 border-b md:border-b-0 md:border-r border-stone-800 px-8 py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-stone-100">Your Brackets</h2>
              <Link
                href={`/brackets/create${modeParam}`}
                className="px-3 py-1.5 rounded text-xs font-medium border border-green-700 text-green-400 hover:border-green-500 hover:text-green-300 transition-colors"
              >
                Create
              </Link>
            </div>

            {brackets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500 text-sm">No brackets yet</p>
                <Link
                  href={`/brackets/create${modeParam}`}
                  className="mt-3 inline-block text-sm hover:underline"
                  style={{ color: "#AE4E02" }}
                >
                  Create your first bracket &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {brackets.slice(0, 5).map((bracket) => {
                  const pct = Math.round((bracket.pick_count / TOTAL_GAMES) * 100);
                  return (
                    <Link
                      key={bracket.id}
                      href={`/brackets/${bracket.id}${modeParam}`}
                      className="rounded-lg p-3 transition-colors hover:border-stone-600"
                      style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-stone-100 text-sm font-medium">{bracket.name}</span>
                        <span className="text-xs text-stone-500">{bracket.pick_count}/{TOTAL_GAMES}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#292524" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct === 100 ? "#4ade80" : "#AE4E02",
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
                {brackets.length > 5 && (
                  <Link
                    href={`/brackets${modeParam}`}
                    className="text-sm text-stone-500 hover:text-stone-300 text-center mt-2"
                  >
                    View all {brackets.length} brackets &rarr;
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Your Pools */}
          <section className="flex-1 px-8 py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-stone-100">Your Pools</h2>
              <div className="flex gap-2">
                <Link
                  href={`/pools${modeParam}`}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-blue-700 text-blue-400 hover:border-blue-500 hover:text-blue-300 transition-colors"
                >
                  Join
                </Link>
                <Link
                  href={`/pools/create${modeParam}`}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-green-700 text-green-400 hover:border-green-500 hover:text-green-300 transition-colors"
                >
                  Create
                </Link>
              </div>
            </div>

            {pools.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500 text-sm">No pools yet</p>
                <Link
                  href={`/pools${modeParam}`}
                  className="mt-3 inline-block text-sm hover:underline"
                  style={{ color: "#AE4E02" }}
                >
                  Join or create a pool &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pools.slice(0, 5).map((pool) => (
                  <Link
                    key={pool.id}
                    href={`/pools/${pool.id}${modeParam}`}
                    className="rounded-lg p-3 transition-colors hover:border-stone-600"
                    style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-stone-100 text-sm font-medium">{pool.name}</span>
                      <span className="text-xs font-mono text-stone-500 tracking-wider">{pool.invite_code}</span>
                    </div>
                    <p className="text-stone-500 text-xs mt-1">
                      {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
                    </p>
                  </Link>
                ))}
                {pools.length > 5 && (
                  <Link
                    href={`/pools${modeParam}`}
                    className="text-sm text-stone-500 hover:text-stone-300 text-center mt-2"
                  >
                    View all {pools.length} pools &rarr;
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
