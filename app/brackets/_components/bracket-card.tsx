"use client";

import Link from "next/link";
import { useState } from "react";
import { BracketWithPicks, TOTAL_GAMES } from "@/lib/types";
import { deleteBracketAction } from "../actions";

interface Props {
  bracket: BracketWithPicks;
  modeParam: string;
}

export default function BracketCard({ bracket, modeParam }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pct = Math.round((bracket.pick_count / TOTAL_GAMES) * 100);
  const dateStr = new Date(bracket.created_at).toLocaleDateString();

  async function handleDelete() {
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
    <div className="card rounded-lg p-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/brackets/${bracket.id}${modeParam}`}
          className="text-stone-100 font-medium hover:text-white transition-colors"
        >
          {bracket.name}
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href={`/brackets/${bracket.id}${modeParam}`}
            className="text-xs px-2.5 py-1 rounded-md transition-colors text-accent hover:bg-white/5"
          >
            {bracket.pick_count === TOTAL_GAMES ? "View" : "Edit"}
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-2.5 py-1 rounded-md transition-colors text-muted hover:bg-white/5 hover:text-red-400 cursor-pointer disabled:opacity-50"
            onBlur={() => setConfirmDelete(false)}
          >
            {deleting ? "…" : confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-stone-800/60">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? "#4ade80" : "var(--accent)",
              }}
            />
          </div>
          <span className="text-xs text-muted">{bracket.pick_count}/{TOTAL_GAMES}</span>
        </div>
        <span className="text-xs text-stone-600">{dateStr}</span>
      </div>
    </div>
  );
}
