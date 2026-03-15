import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { joinPool } from "@/lib/pools";

export default async function JoinPoolByLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await joinPool(supabase, user.id, code);

  if (result.poolId) {
    redirect(`/pools/${result.poolId}`);
  }

  notFound();
}
