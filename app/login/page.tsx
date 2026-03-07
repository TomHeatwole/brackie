"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Sign in to Brackie
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#18181b",
                  brandAccent: "#3f3f46",
                },
              },
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
  );
}
