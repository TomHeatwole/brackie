"use client";

import { useActionState } from "react";
import { finishSigningUp, ProfileFormState } from "../actions";

const initialState: ProfileFormState = {};

interface FieldProps {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  error?: string;
  autoComplete?: string;
}

function Field({ id, label, name, placeholder, error, autoComplete }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-1.5 text-xs font-medium"
        style={{ color: "#a8a29e" }}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
        style={{
          backgroundColor: "#1c1a18",
          border: `1px solid ${error ? "#f87171" : "#3a3530"}`,
          color: "#e7e5e4",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = error ? "#f87171" : "#AE4E02")
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = error ? "#f87171" : "#3a3530")
        }
      />
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function FinishSigningUpForm() {
  const [state, action, isPending] = useActionState(finishSigningUp, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <Field
            id="first_name"
            label="First name"
            name="first_name"
            placeholder="Jane"
            autoComplete="given-name"
            error={state.fieldErrors?.first_name}
          />
        </div>
        <div className="flex-1">
          <Field
            id="last_name"
            label="Last name"
            name="last_name"
            placeholder="Smith"
            autoComplete="family-name"
            error={state.fieldErrors?.last_name}
          />
        </div>
      </div>

      <Field
        id="username"
        label="Username"
        name="username"
        placeholder="janesmith"
        autoComplete="username"
        error={state.fieldErrors?.username}
      />

      {state.error && (
        <p className="text-sm" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 cursor-pointer"
        style={{ backgroundColor: "#AE4E02" }}
        onMouseEnter={(e) => {
          if (!isPending) e.currentTarget.style.backgroundColor = "#8a3e01";
        }}
        onMouseLeave={(e) => {
          if (!isPending) e.currentTarget.style.backgroundColor = "#AE4E02";
        }}
      >
        {isPending ? "Saving…" : "Finish Signing Up"}
      </button>
    </form>
  );
}
