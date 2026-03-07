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
      <Navbar userEmail={user.email} activeTab="My Bracket" />
      <main className="pt-12 min-h-screen" />
    </div>
  );
}
