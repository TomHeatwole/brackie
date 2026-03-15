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
      <p className="text-muted text-sm">
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
        className="input-field flex-1 cursor-pointer"
      >
        <option value="" disabled>Select a bracket…</option>
        {brackets.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.pick_count}/63 picks)
          </option>
        ))}
      </select>
      <button type="submit" disabled={isPending} className="btn-primary shrink-0">
        {isPending ? "Submitting…" : currentBracketId ? "Update" : "Submit"}
      </button>
      {state.error && (
        <p className="text-xs mt-1 text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs mt-1 text-green-400">Bracket submitted!</p>
      )}
    </form>
  );
}
