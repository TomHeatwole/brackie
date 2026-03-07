"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/utils/supabase/client";
import Navbar from "@/app/_components/navbar";

export default function LoginPage() {
  const supabase = createClient();

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
            <p className="mt-1 text-sm text-stone-500">
              March Madness brackets &amp; pools
            </p>
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
              Sign in
            </h2>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#AE4E02",
                      brandAccent: "#8a3e01",
                      inputBackground: "#1c1a18",
                      inputBorder: "#3a3530",
                      inputBorderFocus: "#AE4E02",
                      inputText: "#e7e5e4",
                      inputPlaceholder: "#57534e",
                      messageText: "#a8a29e",
                      anchorTextColor: "#AE4E02",
                      anchorTextHoverColor: "#c85e03",
                    },
                    radii: {
                      borderRadiusButton: "0.5rem",
                      inputBorderRadius: "0.5rem",
                    },
                  },
                },
                style: {
                  label: { color: "#a8a29e", fontSize: "0.8125rem" },
                  button: { fontWeight: "500" },
                },
              }}
              providers={[]}
              magicLink={true}
              view="magic_link"
              redirectTo={
                typeof window !== "undefined"
                  ? `${window.location.origin}/auth/callback`
                  : undefined
              }
              showLinks={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
