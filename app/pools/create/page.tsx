import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import Navbar from "../../_components/navbar";
import CreatePoolForm from "./_components/create-pool-form";

export default async function CreatePoolPage({
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

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} username={userInfo?.username} activeTab="Pools" modeParam={modeParam} />
      <main className="pt-20 min-h-screen flex flex-col items-center">
        <div className="w-full max-w-md px-4">
          <Link
            href={`/pools${modeParam}`}
            className="text-stone-500 text-sm hover:text-stone-300 transition-colors"
          >
            &larr; Back to Pools
          </Link>
          <h1 className="text-2xl font-semibold text-stone-100 mb-8 mt-4 text-center">Create a Pool</h1>
          <CreatePoolForm testMode={testMode} />
        </div>
      </main>
    </div>
  );
}
