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
      <label
        htmlFor={id}
        className="block mb-1.5 text-xs font-medium"
        style={{ color: "#d6d3d1" }}
      >
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
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
        style={{
          backgroundColor: "#1c1a18",
          border: `1px solid ${error ? "#f87171" : "#57534e"}`,
          color: "#e7e5e4",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = error ? "#f87171" : "#AE4E02")
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = error ? "#f87171" : "#57534e")
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
        <label
          className="block mb-1.5 text-xs font-medium"
          style={{ color: "#d6d3d1" }}
        >
          Email address
        </label>
        <div
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: "#1c1a18",
            border: "1px solid #57534e",
            color: "#a8a29e",
          }}
        >
          {email}
        </div>
        <p className="mt-1.5 text-xs" style={{ color: "#78716c" }}>
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
        <p className="text-sm" style={{ color: "#f87171" }}>
          {state.error}
        </p>
      )}

      {state.success && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{
            backgroundColor: "rgba(74, 222, 128, 0.08)",
            border: "1px solid rgba(74, 222, 128, 0.2)",
            color: "#4ade80",
          }}
        >
          Profile saved successfully.
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
        {isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
