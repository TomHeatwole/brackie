import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/user-info";
import Navbar from "@/app/_components/navbar";
import ProfileForm from "./_components/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userInfo = await getUserInfo(supabase, user.id);

  return (
    <div className="min-h-screen bg-stone-950">
      <Navbar userEmail={user.email} />
      <main className="pt-12 min-h-screen flex justify-center px-4">
        <div className="w-full max-w-sm py-16">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white">Profile</h1>
            <p className="mt-1 text-sm text-stone-500">
              Manage your personal information.
            </p>
          </div>

          <div
            className="rounded-xl p-8 shadow-xl"
            style={{
              backgroundColor: "#111110",
              border: "1px solid rgba(174, 78, 2, 0.25)",
            }}
          >
            <ProfileForm
              email={user.email ?? ""}
              initialValues={{
                firstName: userInfo?.first_name ?? null,
                lastName: userInfo?.last_name ?? null,
                username: userInfo?.username ?? null,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
