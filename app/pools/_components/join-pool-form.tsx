"use client";

import { useActionState } from "react";
import { joinPoolAction, JoinPoolFormState } from "../actions";

const initialState: JoinPoolFormState = {};

export default function JoinPoolForm({ testMode }: { testMode: boolean }) {
  const [state, action, isPending] = useActionState(joinPoolAction, initialState);

  return (
    <form action={action} noValidate className="flex gap-2 items-start">
      {testMode && <input type="hidden" name="mode" value="test" />}
      <div className="flex-1">
        <input
          name="invite_code"
          type="text"
          placeholder="Enter invite code"
          maxLength={8}
          className="input-field uppercase tracking-widest"
          style={state.error ? { borderColor: "#f87171" } : undefined}
        />
        {state.error && (
          <p className="mt-1 text-xs text-red-400">{state.error}</p>
        )}
      </div>
      <button type="submit" disabled={isPending} className="btn-primary shrink-0">
        {isPending ? "Joining…" : "Join"}
      </button>
    </form>
  );
}
