"use client";

import { useActionState } from "react";
import { submitBracketToPoolAction, SubmitBracketFormState } from "../actions";
import { BracketWithPicks, TOTAL_GAMES } from "@/lib/types";

const initialState: SubmitBracketFormState = {};

interface Props {
  poolId: string;
  brackets: BracketWithPicks[];
  currentBracketId?: string;
  modeParam?: string;
  hasSelectableGoodies?: boolean;
  poolName?: string;
}

export default function SubmitBracketForm({
  poolId,
  brackets,
  currentBracketId,
  modeParam = "",
  hasSelectableGoodies = false,
  poolName,
}: Props) {
  const [state, action, isPending] = useActionState(submitBracketToPoolAction, initialState);

  const completedBrackets = brackets.filter((b) => b.pick_count === TOTAL_GAMES);

  if (brackets.length === 0) {
    return (
      <p className="text-muted text-sm">
        You don&apos;t have any brackets yet. Create one first!
      </p>
    );
  }

  if (completedBrackets.length === 0) {
    return (
      <p className="text-muted text-sm">
        You don&apos;t have any completed brackets. Fill out all 63 picks in a bracket first, then come back to submit it.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="pool_id" value={poolId} />
      <input type="hidden" name="mode_param" value={modeParam} />
      <div className="flex gap-2 items-start">
        <select
          name="bracket_id"
          defaultValue={
            currentBracketId && completedBrackets.some((b) => b.id === currentBracketId)
              ? currentBracketId
              : ""
          }
          className="input-field flex-1 cursor-pointer"
        >
          <option value="" disabled>Select a bracket…</option>
          {completedBrackets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending} className="btn-primary shrink-0">
          {isPending
            ? "Submitting…"
            : currentBracketId
              ? "Update"
              : hasSelectableGoodies
                ? `Submit to ${poolName ?? "pool"} and continue to Goodie Selection`
                : "Submit"}
        </button>
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs text-green-400">Bracket submitted!</p>
      )}
    </form>
  );
}
