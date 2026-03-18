"use client";

import { useState } from "react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

interface ScoringTooltipProps {
  content: React.ReactNode;
  /** Optional accent color for Goodies tooltip */
  variant?: "default" | "goodies";
}

export default function ScoringTooltip({ content, variant = "default" }: ScoringTooltipProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const showOnHover = !isMobile;
  const showOnClick = isMobile;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label="More info"
        onMouseEnter={showOnHover ? () => setOpen(true) : undefined}
        onMouseLeave={showOnHover ? () => setOpen(false) : undefined}
        onClick={showOnClick ? () => setOpen((o) => !o) : undefined}
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-500/60 bg-stone-800/60 text-stone-400 hover:border-stone-400 hover:text-stone-300 focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        <span className="text-[10px] font-semibold leading-none">?</span>
      </button>
      <div
        className={`absolute right-0 top-full z-20 mt-1 w-64 rounded-md border px-3 py-2 text-[11px] shadow-lg backdrop-blur-sm ${
          variant === "goodies"
            ? "border-accent/40 bg-stone-950/95 text-stone-100"
            : "border-card-border bg-stone-950/95 text-stone-200"
        } ${showOnHover && (open ? "opacity-100" : "pointer-events-none opacity-0")} ${
          showOnClick && (open ? "block" : "hidden")
        } transition`}
      >
        <div className={isMobile ? "pr-6" : ""}>{content}</div>
        {isMobile && (
          <button
            type="button"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="absolute right-2 top-2 text-stone-500 hover:text-stone-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
