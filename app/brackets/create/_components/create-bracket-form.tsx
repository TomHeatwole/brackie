"use client";

import { useActionState } from "react";
import { createBracketAction, CreateBracketFormState } from "../actions";

const initialState: CreateBracketFormState = {};

export default function CreateBracketForm({
  testMode,
  poolId,
}: {
  testMode: boolean;
  poolId?: string;
}) {
  const [state, action, isPending] = useActionState(createBracketAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-5 w-full max-w-sm">
      {testMode && <input type="hidden" name="mode" value="test" />}
      {poolId && <input type="hidden" name="pool_id" value={poolId} />}

      <div>
        <label htmlFor="bracket-name" className="block text-xs font-medium mb-1.5 text-muted-foreground">
          Bracket Name
        </label>
        <input
          id="bracket-name"
          name="name"
          type="text"
          placeholder="e.g. My 2026 Bracket"
          maxLength={50}
          className="input-field"
          style={state.fieldErrors?.name ? { borderColor: "#f87171" } : undefined}
        />
        {state.fieldErrors?.name && (
          <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.name}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Creating…" : "Create & Start Picking"}
      </button>
    </form>
  );
}
