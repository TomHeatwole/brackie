"use client";

import { useActionState } from "react";
import { createBracketAction, CreateBracketFormState } from "../actions";

const initialState: CreateBracketFormState = {};

export default function CreateBracketForm({ testMode }: { testMode: boolean }) {
  const [state, action, isPending] = useActionState(createBracketAction, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-5 w-full max-w-sm">
      {testMode && <input type="hidden" name="mode" value="test" />}

      <div>
        <label
          htmlFor="bracket-name"
          className="block text-xs font-medium mb-1.5"
          style={{ color: "#a8a29e" }}
        >
          Bracket Name
        </label>
        <input
          id="bracket-name"
          name="name"
          type="text"
          placeholder="e.g. My 2026 Bracket"
          maxLength={50}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            backgroundColor: "#1c1a18",
            border: `1px solid ${state.fieldErrors?.name ? "#f87171" : "#3a3530"}`,
            color: "#e7e5e4",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = state.fieldErrors?.name ? "#f87171" : "#AE4E02")}
          onBlur={(e) => (e.currentTarget.style.borderColor = state.fieldErrors?.name ? "#f87171" : "#3a3530")}
        />
        {state.fieldErrors?.name && (
          <p className="mt-1.5 text-xs" style={{ color: "#f87171" }}>{state.fieldErrors.name}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm" style={{ color: "#f87171" }}>{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 cursor-pointer"
        style={{ backgroundColor: "#AE4E02" }}
        onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = "#8a3e01"; }}
        onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.backgroundColor = "#AE4E02"; }}
      >
        {isPending ? "Creating…" : "Create & Start Picking"}
      </button>
    </form>
  );
}
