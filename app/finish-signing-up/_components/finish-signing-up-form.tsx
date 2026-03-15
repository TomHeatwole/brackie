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
  hint?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Field({ id, label, name, placeholder, error, autoComplete, hint, onChange }: FieldProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        {hint && !error && (
          <span className="text-xs text-muted">{hint}</span>
        )}
      </div>
      <input
        id={id}
        name={name}
        type="text"
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={onChange}
        className="input-field"
        style={error ? { borderColor: "#f87171" } : undefined}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

function filterUsername(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
}

export default function FinishSigningUpForm() {
  const [state, action, isPending] = useActionState(finishSigningUp, initialState);

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const filtered = filterUsername(e.target.value);
    if (filtered !== e.target.value) {
      e.target.value = filtered;
    }
  }

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
        hint="Letters, numbers, underscores only"
        error={state.fieldErrors?.username}
        onChange={handleUsernameChange}
      />

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
        {isPending ? "Saving…" : "Finish Signing Up"}
      </button>
    </form>
  );
}
