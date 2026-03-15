"use client";

import { useActionState } from "react";
import { createPoolAction, CreatePoolFormState } from "../actions";

const initialState: CreatePoolFormState = {};

export default function CreatePoolForm({ testMode }: { testMode: boolean }) {
  const [state, action, isPending] = useActionState(createPoolAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-5 w-full max-w-sm">
      {testMode && <input type="hidden" name="mode" value="test" />}

      <div>
        <label htmlFor="pool-name" className="block text-xs font-medium mb-1.5 text-muted-foreground">
          Pool Name
        </label>
        <input
          id="pool-name"
          name="name"
          type="text"
          placeholder="e.g. Office Pool 2026"
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
        {isPending ? "Creating…" : "Create Pool"}
      </button>
    </form>
  );
}
