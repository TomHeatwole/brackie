import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Navbar from "../_components/navbar";

export default async function BracketsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} activeTab="Brackets" />
      <main className="pt-12 min-h-screen flex items-center justify-center">
        <p className="text-stone-500">TODO: Brackets</p>
      </main>
    </div>
  );
}
