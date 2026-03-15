"use client";

import { useState } from "react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import UserMenu from "./user-menu";

const NAV_TABS = [
  { label: "Dashboard", href: "/" },
  { label: "Brackets", href: "/brackets" },
  { label: "Pools", href: "/pools" },
];

interface NavbarProps {
  userEmail?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  activeTab?: string;
  modeParam?: string;
}

export default function Navbar({ userEmail, firstName, lastName, avatarUrl, activeTab, modeParam = "" }: NavbarProps) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between px-4 shadow-lg backdrop-blur-md"
        style={{ backgroundColor: "rgba(12, 10, 9, 0.85)", borderBottom: "1px solid var(--card-border)" }}
      >
        <a href={`/${modeParam}`} className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-lg leading-none select-none text-accent">[ ]</span>
          <span className="text-white font-semibold text-base tracking-tight">brackie</span>
        </a>

        {!isMobile && (
          <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_TABS.map((tab) => {
              const isActive = tab.label === activeTab;
              return (
                <a
                  key={tab.label}
                  href={`${tab.href}${modeParam}`}
                  className={`px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white pb-[10px] pt-[12px] border-b-2 border-accent"
                      : "text-stone-400 hover:text-stone-200 hover:bg-white/5 rounded py-1.5"
                  }`}
                >
                  {tab.label}
                </a>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {userEmail && <UserMenu userEmail={userEmail} firstName={firstName} lastName={lastName} avatarUrl={avatarUrl} />}
          {isMobile && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="ml-1 p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div
          className="fixed top-12 left-0 right-0 z-40 py-2 shadow-xl backdrop-blur-md"
          style={{ backgroundColor: "rgba(12, 10, 9, 0.95)", borderBottom: "1px solid var(--card-border)" }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = tab.label === activeTab;
            return (
              <a
                key={tab.label}
                href={`${tab.href}${modeParam}`}
                onClick={() => setMenuOpen(false)}
                className={`block px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "text-accent" : "text-stone-400 active:bg-white/5"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
