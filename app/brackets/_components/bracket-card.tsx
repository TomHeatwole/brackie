"use client";

import Link from "next/link";
import { useState } from "react";
import { BracketWithPicks } from "@/lib/types";
import { deleteBracketAction } from "../actions";

interface Props {
  bracket: BracketWithPicks;
  modeParam: string;
}

export default function BracketCard({ bracket, modeParam }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      className="card rounded-lg p-4 block hover:border-stone-600 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-stone-100 font-medium">
          {bracket.name}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2.5 py-1 rounded-md transition-colors text-muted hover:bg-white/5 hover:text-red-400 cursor-pointer disabled:opacity-50"
          onBlur={() => setConfirmDelete(false)}
        >
          {deleting ? "…" : confirmDelete ? "Confirm?" : "Delete"}
        </button>
      </div>
      {bracket.champion_name ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">Champion</span>
          <span className="text-sm font-medium text-accent">
            ({bracket.champion_seed}) {bracket.champion_name}
          </span>
        </div>
      ) : (
        <div className="mt-2 text-xs text-stone-600 italic">No champion picked yet</div>
      )}
    </Link>
  );
}
