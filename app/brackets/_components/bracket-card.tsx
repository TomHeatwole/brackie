"use client";

import Link from "next/link";
import { useState } from "react";
import { BracketWithPicks, TOTAL_GAMES } from "@/lib/types";
import { deleteBracketAction } from "../actions";
import TeamIcon from "@/app/_components/team-icon";

interface Props {
  bracket: BracketWithPicks;
  modeParam: string;
}

export default function BracketCard({ bracket, modeParam }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = Math.round((bracket.pick_count / TOTAL_GAMES) * 100);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await deleteBracketAction(bracket.id);
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <Link
      href={`/brackets/${bracket.id}${modeParam}`}
      className="card p-4 block hover:border-card-border-hover"
    >
      <div className="flex items-center justify-between">
        <span className="text-stone-100 font-medium">
          {bracket.name}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-50 ${
            confirmDelete
              ? "text-danger bg-danger/10"
              : "text-muted hover:bg-white/5 hover:text-red-400"
          }`}
          onBlur={() => setConfirmDelete(false)}
        >
          {deleting ? "…" : confirmDelete ? "Confirm?" : "Delete"}
        </button>
      </div>
      {bracket.champion_name ? (
        <div className="mt-2 flex items-center gap-2">
          <TeamIcon
            team={{
              name: bracket.champion_name,
              icon_url: bracket.champion_icon_url ?? null,
            }}
            size="xs"
          />
          <span className="text-sm font-medium text-accent">
            ({bracket.champion_seed}) {bracket.champion_name}
          </span>
        </div>
      ) : (
        <div className="mt-2 text-xs text-stone-600 italic">No champion picked yet</div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-stone-800/60">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? "var(--success)" : "var(--accent)",
            }}
          />
        </div>
        <span className="text-[11px] text-muted font-mono tabular-nums shrink-0">
          {bracket.pick_count}/{TOTAL_GAMES}
        </span>
      </div>
    </Link>
  );
}
