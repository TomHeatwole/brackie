"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import UserAvatar from "./user-avatar";

interface UserMenuProps {
  userEmail: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export default function UserMenu({ userEmail, username, avatarUrl }: UserMenuProps) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-all hover:bg-white/5 border border-transparent hover:border-card-border"
      >
        <UserAvatar avatarUrl={avatarUrl} username={username} email={userEmail} size="sm" />
        <span className="text-stone-300 text-xs max-w-[140px] truncate hidden sm:block">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg shadow-2xl py-1 z-50 border border-card-border" style={{ backgroundColor: "var(--card)" }}>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-4 py-2 text-sm text-stone-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Profile
          </Link>
          <div className="my-1 border-t border-card-border" />
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-stone-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
