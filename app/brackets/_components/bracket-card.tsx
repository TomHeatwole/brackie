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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const pct = Math.round((bracket.pick_count / TOTAL_GAMES) * 100);
  const submittedToPools = (bracket.pool_submission_count ?? 0) > 0;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const native = e.nativeEvent as unknown as {
      stopImmediatePropagation?: () => void;
    };
    native.stopImmediatePropagation?.();
    if (submittedToPools) {
      setShowDeleteDialog(true);
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      setDeleting(true);
      await deleteBracketAction(bracket.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="card p-4 block hover:border-card-border-hover relative">
      {/* Loading overlay when delete is in progress */}
      {deleting && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/80 backdrop-blur-[2px]"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-accent"
              aria-hidden
            />
            <span className="text-sm font-medium text-stone-300">Deleting…</span>
          </div>
        </div>
      )}

      <Link
        href={`/brackets/${bracket.id}${modeParam}`}
        className="absolute inset-0 z-0"
        aria-label={`Open bracket ${bracket.name}`}
      >
        <span className="sr-only">Open bracket</span>
      </Link>

      <div className="relative z-10 pointer-events-none">
        <div className="flex items-center justify-between">
          <span className="text-stone-100 font-medium">
            {bracket.name}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`pointer-events-auto text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-50 ${
              confirmDelete
                ? "text-danger bg-danger/10"
                : "text-muted hover:bg-white/5 hover:text-red-400"
            }`}
            onBlur={() => setConfirmDelete(false)}
          >
            {deleting ? "…" : confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
        {showDeleteDialog && (
          <div
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
            }}
            onClick={(e) => {
              // Prevent any clicks inside the modal from bubbling.
              e.preventDefault();
              e.stopPropagation();
              (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
            }}
          >
            <div className="w-full max-w-sm rounded-lg bg-stone-900 border border-card-border p-5 shadow-lg">
              <h2 className="text-sm font-semibold text-stone-100 mb-2">
                Delete bracket?
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                This bracket is submitted to at least one pool. Deleting it will also remove it
                from those pools. Are you sure you want to permanently delete it?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-md border border-card-border text-muted hover:bg-white/5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                    setShowDeleteDialog(false);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-md bg-danger text-white hover:bg-danger/90 disabled:opacity-60"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                    try {
                      setDeleting(true);
                      await deleteBracketAction(bracket.id);
                      setShowDeleteDialog(false);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.nativeEvent as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete anyway"}
                </button>
              </div>
            </div>
          </div>
        )}
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
      </div>
    </div>
  );
}
