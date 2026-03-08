import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Navbar from "./_components/navbar";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} activeTab="Dashboard" />
      <main className="pt-12 min-h-screen flex justify-center">
        <div className="w-full max-w-5xl flex">
          {/* Your Brackets */}
          <section className="flex-1 flex flex-col items-center justify-center gap-6 border-r border-stone-800 px-16 py-20">
            <h2 className="text-2xl font-semibold text-stone-100">Your Brackets</h2>
            <p className="text-stone-500 text-sm">You haven&apos;t created any brackets</p>
            <button className="px-4 py-2 rounded text-sm font-medium border border-green-700 text-green-400 hover:border-green-500 hover:text-green-300 transition-colors cursor-pointer">
              Create a Bracket
            </button>
          </section>

          {/* Your Pools */}
          <section className="flex-1 flex flex-col items-center justify-center gap-6 px-16 py-20">
            <h2 className="text-2xl font-semibold text-stone-100">Your Pools</h2>
            <p className="text-stone-500 text-sm">You haven&apos;t joined any pools</p>
            <div className="flex gap-3">
              <button className="w-32 py-2 rounded text-sm font-medium border border-blue-700 text-blue-400 hover:border-blue-500 hover:text-blue-300 transition-colors cursor-pointer">
                Join a Pool
              </button>
              <button className="w-32 py-2 rounded text-sm font-medium border border-green-700 text-green-400 hover:border-green-500 hover:text-green-300 transition-colors cursor-pointer">
                Create a Pool
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
