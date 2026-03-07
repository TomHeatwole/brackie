"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-stone-500 border border-stone-800 rounded-full px-3 py-1 transition-colors hover:text-white hover:border-stone-600"
    >
      Sign out
    </button>
  );
}
