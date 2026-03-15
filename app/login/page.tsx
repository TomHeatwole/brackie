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

    const next = new URLSearchParams(window.location.search).get("next") || "/";
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex min-h-screen items-center justify-center pt-12 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="text-4xl font-bold select-none text-accent">[ ]</span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              brackie
            </h1>
          </div>

          <div className="rounded-xl p-8 shadow-xl bg-card border border-card-border">
            <h2 className="mb-5 text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Sign In or Create Account
            </h2>

            {submitted ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg px-4 py-3 text-sm bg-accent/10 border border-accent/25 text-stone-300">
                  Check your email — we sent a login link to{" "}
                  <span className="font-medium text-white">{email}</span>.
                </div>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="btn-outline w-full py-2"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <label htmlFor="email" className="block mb-1.5 text-xs font-medium text-muted-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                />
                {error && (
                  <p className="mt-2 text-xs text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-4"
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
