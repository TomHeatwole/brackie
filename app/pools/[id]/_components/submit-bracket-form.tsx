"use client";

import { useActionState } from "react";
import { submitBracketToPoolAction, SubmitBracketFormState } from "../actions";
import { BracketWithPicks } from "@/lib/types";

const initialState: SubmitBracketFormState = {};

interface Props {
  poolId: string;
  brackets: BracketWithPicks[];
  currentBracketId?: string;
}

export default function SubmitBracketForm({ poolId, brackets, currentBracketId }: Props) {
  const [state, action, isPending] = useActionState(submitBracketToPoolAction, initialState);

  if (brackets.length === 0) {
    return (
      <p className="text-stone-500 text-sm">
        You don&apos;t have any brackets yet. Create one first!
      </p>
    );
  }

  return (
    <form action={action} className="flex gap-2 items-start">
      <input type="hidden" name="pool_id" value={poolId} />
      <select
        name="bracket_id"
        defaultValue={currentBracketId ?? ""}
        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
        style={{ backgroundColor: "#1c1a18", border: "1px solid #3a3530", color: "#e7e5e4" }}
      >
        <option value="" disabled>Select a bracket…</option>
        {brackets.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.pick_count}/63 picks)
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 cursor-pointer shrink-0"
        style={{ backgroundColor: "#AE4E02" }}
        onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = "#8a3e01"; }}
        onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = "#AE4E02"; }}
      >
        {isPending ? "Submitting…" : currentBracketId ? "Update" : "Submit"}
      </button>
      {state.error && (
        <p className="text-xs mt-1" style={{ color: "#f87171" }}>{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs mt-1" style={{ color: "#4ade80" }}>Bracket submitted!</p>
      )}
    </form>
  );
}
