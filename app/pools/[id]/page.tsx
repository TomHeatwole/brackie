import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getPool, getPoolMembers } from "@/lib/pools";
import { getUserBrackets } from "@/lib/brackets";
import Navbar from "../../_components/navbar";
import InviteCodeDisplay from "./_components/invite-code-display";
import SubmitBracketForm from "./_components/submit-bracket-form";

export default async function PoolDetailPage({
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

  const members = await getPoolMembers(supabase, poolId);
  const allUserBrackets = await getUserBrackets(supabase, user.id);
  const userBrackets = allUserBrackets.filter(
    (b) => b.tournament_id === pool.tournament_id
  );

  const currentUserPoolBracket = members.find(
    (m) => m.user_id === user.id && m.bracket_submitted
  );

  const { data: poolBracketRow } = await supabase
    .from("pool_brackets")
    .select("bracket_id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isMember = members.some((m) => m.user_id === user.id);

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} username={userInfo?.username} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 min-h-screen flex justify-center">
        <div className="w-full max-w-2xl px-4">
          <Link
            href={`/pools${modeParam}`}
            className="text-stone-500 text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Pools
          </Link>

          <div className="mt-4 mb-8">
            <h1 className="text-2xl font-semibold text-stone-100">{pool.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-stone-500 text-sm">
                {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
              </span>
              {pool.creator_username && (
                <span className="text-stone-500 text-sm">Created by {pool.creator_username}</span>
              )}
            </div>
          </div>

          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-stone-300 mb-1">Invite Code</h2>
                <p className="text-stone-500 text-xs">Share this code with friends to invite them</p>
              </div>
              <InviteCodeDisplay code={pool.invite_code} />
            </div>
          </div>

          {isMember && (
            <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}>
              <h2 className="text-sm font-medium text-stone-300 mb-3">
                {currentUserPoolBracket ? "Your Submitted Bracket" : "Submit a Bracket"}
              </h2>
              <SubmitBracketForm
                poolId={poolId}
                brackets={userBrackets}
                currentBracketId={poolBracketRow?.bracket_id}
              />
              {userBrackets.length === 0 && (
                <Link
                  href={`/brackets/create${modeParam}`}
                  className="mt-3 inline-block text-sm hover:underline"
                  style={{ color: "#AE4E02" }}
                >
                  Create a bracket first &rarr;
                </Link>
              )}
            </div>
          )}

          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #3a3530" }}>
            <div className="px-4 py-3" style={{ backgroundColor: "#1c1a18" }}>
              <h2 className="text-sm font-medium text-stone-300">Members</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#3a3530" }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: "#0c0a09" }}
                >
                  <div>
                    <span className="text-stone-200 text-sm">
                      {member.username ?? member.first_name ?? "Anonymous"}
                    </span>
                    {member.user_id === pool.creator_id && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#3a3530", color: "#a8a29e" }}>
                        Creator
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {member.bracket_submitted ? (
                      <span className="text-xs" style={{ color: "#4ade80" }}>
                        {member.bracket_name ?? "Bracket submitted"}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-600">No bracket</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
