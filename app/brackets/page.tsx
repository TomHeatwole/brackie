import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import { getUserBrackets } from "@/lib/brackets";
import Navbar from "../_components/navbar";
import BracketCard from "./_components/bracket-card";

export default async function BracketsPage({
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

  const brackets = await getUserBrackets(supabase, user.id);

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} username={userInfo?.username} activeTab="Brackets" modeParam={modeParam} />
      <main className="pt-20 min-h-screen flex justify-center">
        <div className="w-full max-w-2xl px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-stone-100">Your Brackets</h1>
            <Link
              href={`/brackets/create${modeParam}`}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#AE4E02" }}
            >
              Create a Bracket
            </Link>
          </div>

          {brackets.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-500 text-sm">You haven&apos;t created any brackets yet.</p>
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
              {brackets.map((bracket) => (
                <BracketCard key={bracket.id} bracket={bracket} modeParam={modeParam} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
