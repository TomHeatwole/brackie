import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo, isProfileComplete } from "@/utils/user-info";
import Navbar from "@/app/_components/navbar";
import FinishSigningUpForm from "./_components/finish-signing-up-form";

export default async function FinishSigningUpPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userInfo = await getUserInfo(supabase, user.id);
  if (isProfileComplete(userInfo)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar />

      <div className="flex min-h-screen items-center justify-center pt-12 px-4">
        <div className="w-full max-w-sm">
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

          <div
            className="rounded-xl p-8 shadow-xl"
            style={{
              backgroundColor: "#111110",
              border: "1px solid rgba(174, 78, 2, 0.25)",
            }}
          >
            <h2 className="mb-1 text-sm font-medium text-stone-400 uppercase tracking-widest">
              Finish Signing Up
            </h2>
            <p className="mb-6 text-xs text-stone-500">
              Just a few details before you can start making brackets.
            </p>

            <FinishSigningUpForm />
          </div>
        </div>
      </div>
    </div>
  );
}
