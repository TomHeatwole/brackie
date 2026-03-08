"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface UserMenuProps {
  userEmail: string;
  username?: string | null;
}

export default function UserMenu({ userEmail, username }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = username ? `@${username}` : userEmail;
  const avatarInitial = (username ?? userEmail)[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-full pl-1 pr-3 py-1 transition-colors hover:border-stone-600 hover:bg-stone-800"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: "#AE4E02" }}
        >
          {avatarInitial}
        </div>
        <span className="text-stone-300 text-xs max-w-[140px] truncate hidden sm:block">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-stone-900 border border-stone-800 rounded-lg shadow-xl py-1 z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-4 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
          >
            Profile
          </Link>
          <div className="my-1 border-t border-stone-800" />
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
