"use client";

import { useActionState, useState } from "react";
import { updateProfile, ProfileFormState } from "../actions";

const initialState: ProfileFormState = {};

interface FieldProps {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
}

function Field({
  id,
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block mb-1.5 text-xs font-medium text-stone-300">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        style={error ? { borderColor: "#f87171" } : undefined}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

interface ProfileFormProps {
  email: string;
  initialValues: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
}

export default function ProfileForm({ email, initialValues }: ProfileFormProps) {
  const [state, action, isPending] = useActionState(updateProfile, initialState);
  const [firstName, setFirstName] = useState(initialValues.firstName ?? "");
  const [lastName, setLastName] = useState(initialValues.lastName ?? "");
  const [username, setUsername] = useState(initialValues.username ?? "");

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {/* Email — read only */}
      <div>
        <label className="block mb-1.5 text-xs font-medium text-stone-300">
          Email address
        </label>
        <div className="w-full rounded-lg px-3 py-2 text-sm bg-card border border-card-border text-muted-foreground">
          {email}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Email cannot be changed here.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Field
            id="first_name"
            label="First name"
            name="first_name"
            placeholder="Jane"
            autoComplete="given-name"
            value={firstName}
            onChange={setFirstName}
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
            value={lastName}
            onChange={setLastName}
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
        value={username}
        onChange={setUsername}
        error={state.fieldErrors?.username}
      />

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      {state.success && (
        <p className="text-sm rounded-lg px-3 py-2 bg-green-500/8 border border-green-500/20 text-green-400">
          Profile saved successfully.
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
        {isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
