import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { joinPool } from "@/lib/pools";

const SHARE_TITLE = "Join my pool on brackie";
const SHARE_DESCRIPTION = "Join my pool on brackie";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "brackie",
    description: SHARE_DESCRIPTION,
    openGraph: {
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
      images: [{ url: "https://brackie.games/share_logo.png", width: 512, height: 512, alt: "Brackie!" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
      images: ["https://brackie.games/share_logo.png"],
    },
  };
}

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-semibold text-stone-100 text-center mb-2">
          Join my pool on Brackie!
        </h1>
        <p className="text-muted text-center mb-6">
          Sign in to join this pool and make your bracket.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/pools/join/${code}`)}`}
          className="btn-primary px-6 py-3 text-base font-medium"
        >
          Sign in to join
        </Link>
      </div>
    );
  }

  const result = await joinPool(supabase, user.id, code);

  if (result.poolId) {
    redirect(`/pools/${result.poolId}`);
  }

  notFound();
}
