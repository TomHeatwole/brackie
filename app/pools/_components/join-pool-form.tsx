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
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors uppercase tracking-widest"
          style={{
            backgroundColor: "#1c1a18",
            border: `1px solid ${state.error ? "#f87171" : "#3a3530"}`,
            color: "#e7e5e4",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#AE4E02")}
          onBlur={(e) => (e.currentTarget.style.borderColor = state.error ? "#f87171" : "#3a3530")}
        />
        {state.error && (
          <p className="mt-1 text-xs" style={{ color: "#f87171" }}>{state.error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 cursor-pointer shrink-0"
        style={{ backgroundColor: "#AE4E02" }}
        onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = "#8a3e01"; }}
        onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = "#AE4E02"; }}
      >
        {isPending ? "Joining…" : "Join"}
      </button>
    </form>
  );
}
