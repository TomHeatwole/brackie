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
    <div
      className="rounded-lg p-4 transition-colors"
      style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}
    >
      <div className="flex items-center justify-between">
        <Link
          href={`/brackets/${bracket.id}${modeParam}`}
          className="text-stone-100 font-medium hover:underline"
        >
          {bracket.name}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/brackets/${bracket.id}${modeParam}`}
            className="text-xs px-2 py-1 rounded transition-colors hover:bg-stone-800"
            style={{ color: "#AE4E02" }}
          >
            {bracket.pick_count === TOTAL_GAMES ? "View" : "Edit"}
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-2 py-1 rounded transition-colors hover:bg-stone-800 text-stone-500 hover:text-red-400 cursor-pointer disabled:opacity-50"
            onBlur={() => setConfirmDelete(false)}
          >
            {deleting ? "…" : confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#292524" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? "#4ade80" : "#AE4E02",
              }}
            />
          </div>
          <span className="text-xs text-stone-500">{bracket.pick_count}/{TOTAL_GAMES}</span>
        </div>
        <span className="text-xs text-stone-600">{dateStr}</span>
      </div>
    </div>
  );
}
