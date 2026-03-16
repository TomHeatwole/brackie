import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import Navbar from "../../_components/navbar";
import CreateBracketForm from "./_components/create-bracket-form";

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
  const testMode = params?.mode === "test";
  const modeParam = testMode ? "?mode=test" : "";
  const poolId = typeof params?.pool === "string" ? params.pool : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={user.email} firstName={userInfo?.first_name} lastName={userInfo?.last_name} avatarUrl={userInfo?.avatar_url} activeTab="Brackets" modeParam={modeParam} />
      <main className="pt-20 pb-20 md:pb-8 min-h-screen flex flex-col items-center">
        <div className="w-full max-w-md px-4">
          <Link
            href={`/brackets${modeParam}`}
            className="text-muted text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Brackets
          </Link>
          <h1 className="text-2xl font-semibold text-stone-100 mb-8 mt-4 text-center">Create a Bracket</h1>
          <CreateBracketForm testMode={testMode} poolId={poolId} />
        </div>
      </main>
    </div>
  );
}
