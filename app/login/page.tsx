"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Navbar from "@/app/_components/navbar";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar />

      <div className="flex min-h-screen items-center justify-center pt-12 px-4">
        <div className="w-full max-w-sm">
          {/* Logo mark */}
          <div className="mb-8 text-center">
            <span
              className="text-4xl font-bold select-none"
              style={{ color: "#AE4E02" }}
            >
              [ ]
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              brackie
            </h1>
          </div>

          {/* Auth card */}
          <div
            className="rounded-xl p-8 shadow-xl"
            style={{
              backgroundColor: "#111110",
              border: "1px solid rgba(174, 78, 2, 0.25)",
            }}
          >
            <h2 className="mb-5 text-sm font-medium text-stone-400 uppercase tracking-widest">
              Sign In or Create Account
            </h2>

            {submitted ? (
              <div className="flex flex-col gap-3">
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "rgba(174, 78, 2, 0.12)",
                    border: "1px solid rgba(174, 78, 2, 0.3)",
                    color: "#c8a07a",
                  }}
                >
                  Check your email — we sent a login link to{" "}
                  <span className="font-medium text-white">{email}</span>.
                </div>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="w-full rounded-lg py-2 text-sm font-medium transition-colors"
                  style={{ color: "#a8a29e", backgroundColor: "#1c1a18", border: "1px solid #3a3530" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#AE4E02")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#3a3530")}
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <label
                  htmlFor="email"
                  className="block mb-1.5 text-xs font-medium"
                  style={{ color: "#a8a29e" }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "#1c1a18",
                    border: "1px solid #3a3530",
                    color: "#e7e5e4",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#AE4E02")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#3a3530")
                  }
                />
                {error && (
                  <p className="mt-2 text-xs" style={{ color: "#f87171" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: loading ? "#8a3e01" : "#AE4E02" }}
                  onMouseEnter={(e) => {
                    if (!loading)
                      e.currentTarget.style.backgroundColor = "#8a3e01";
                  }}
                  onMouseLeave={(e) => {
                    if (!loading)
                      e.currentTarget.style.backgroundColor = "#AE4E02";
                  }}
                >
                  {loading ? "Sending…" : "Send Login Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
