"use client";

import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import UserMenu from "./user-menu";

const NAV_TABS = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Brackets",
    href: "/brackets",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Pools",
    href: "/pools",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
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

  return (
    <>
      {/* Top bar */}
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
        </div>
      </nav>

      {/* Mobile bottom tab bar — only for authenticated users */}
      {isMobile && userEmail && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around backdrop-blur-md"
          style={{
            backgroundColor: "rgba(12, 10, 9, 0.92)",
            borderTop: "1px solid var(--card-border)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = tab.label === activeTab;
            return (
              <a
                key={tab.label}
                href={`${tab.href}${modeParam}`}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition-colors ${
                  isActive ? "text-accent" : "text-stone-500 active:text-stone-300"
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium">{tab.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
