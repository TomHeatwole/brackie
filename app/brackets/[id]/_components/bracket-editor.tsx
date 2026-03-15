"use client";

import { useState } from "react";
import { Team, TournamentGame } from "@/lib/types";
import BracketTree from "@/app/_components/bracket-tree";
import { saveBracketPicksAction, saveAndSubmitToPoolAction } from "@/app/brackets/create/actions";
import { useRouter } from "next/navigation";

interface Props {
  bracketId: string;
  bracketName: string;
  teams: Team[];
  games: TournamentGame[];
  initialPicks: Record<string, string>;
  locked: boolean;
  poolId?: string;
  poolName?: string;
}

export default function BracketEditor({
  bracketId,
  bracketName,
  teams,
  games,
  initialPicks,
  locked,
  poolId,
  poolName,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave(picks: Record<string, string>) {
    setSaving(true);
    setSaveStatus(null);

    const result = poolId
      ? await saveAndSubmitToPoolAction(bracketId, poolId, picks)
      : await saveBracketPicksAction(bracketId, picks);

    setSaving(false);
    if (result.success) {
      if (poolId) {
        setSaveStatus("Submitted!");
        setTimeout(() => router.push(`/pools/${poolId}`), 1000);
      } else {
        setSaveStatus("Saved!");
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } else {
      setSaveStatus(result.error ?? "Failed to save");
    }
  }

  const saveLabel = poolId && poolName
    ? `Save and submit to ${poolName}`
    : undefined;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-2 gap-2">
        <h1 className="text-lg sm:text-xl font-semibold text-stone-100 truncate">{bracketName}</h1>
        <div className="flex items-center gap-3 shrink-0">
          {locked && (
            <span className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
              Locked
            </span>
          )}
          {saveStatus && (
            <span
              className="text-sm font-medium"
              style={{ color: saveStatus === "Saved!" || saveStatus === "Submitted!" ? "#4ade80" : "#f87171" }}
            >
              {saveStatus}
            </span>
          )}
        </div>
      </div>
      <BracketTree
        teams={teams}
        games={games}
        initialPicks={initialPicks}
        readOnly={locked}
        onSave={locked ? undefined : handleSave}
        saving={saving}
        saveLabel={saveLabel}
      />
    </div>
  );
}
