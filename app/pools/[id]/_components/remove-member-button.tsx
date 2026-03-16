"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removePoolMemberAction } from "../actions";

interface RemoveMemberButtonProps {
  poolId: string;
  memberUserId: string;
  memberDisplayName: string;
}

export default function RemoveMemberButton({
  poolId,
  memberUserId,
  memberDisplayName,
}: RemoveMemberButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);
    const result = await removePoolMemberAction(poolId, memberUserId);
    setLoading(false);
    setConfirming(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400">{error}</span>
        <button
          type="button"
          onClick={() => setError(null)}
          className="text-xs text-stone-500 hover:text-stone-400"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500">
          Remove {memberDisplayName}?
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
        >
          {loading ? "…" : "Yes, remove"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs text-stone-500 hover:text-stone-400 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-stone-500 hover:text-red-400 transition-colors"
    >
      Remove
    </button>
  );
}
