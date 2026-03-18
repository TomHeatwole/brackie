"use client";

import { useState } from "react";
import { Team, TournamentGame, BracketStructure } from "@/lib/types";
import BracketTree, { clearBracketDraft } from "@/app/_components/bracket-tree";
import { saveBracketPicksAction, saveAndSubmitToPoolAction } from "@/app/brackets/create/actions";
import { useRouter } from "next/navigation";
import { useStartNavigation } from "@/app/_components/navigation-progress";

interface Props {
  bracketId: string;
  bracketName: string;
  teams: Team[];
  games: TournamentGame[];
  bracketStructure?: BracketStructure | null;
  initialPicks: Record<string, string>;
  locked: boolean;
  poolId?: string;
  poolName?: string;
  modeParam?: string;
  hasSelectableGoodies?: boolean;
}

export default function BracketEditor({
  bracketId,
  bracketName,
  teams,
  games,
  bracketStructure,
  initialPicks,
  locked,
  poolId,
  poolName,
  modeParam = "",
  hasSelectableGoodies = false,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const router = useRouter();
  const startNavigation = useStartNavigation();

  async function handleSave(picks: Record<string, string>) {
    setSaving(true);
    setSaveStatus(null);

    try {
      const result = poolId
        ? await saveAndSubmitToPoolAction(bracketId, poolId, picks)
        : await saveBracketPicksAction(bracketId, picks);

      if (result.success) {
        clearBracketDraft(bracketId);
        if (poolId) {
          setSaveStatus("Submitted!");
          setTimeout(() => {
            startNavigation();
            const target = result.hasSelectableGoodies
              ? `/pools/${poolId}/goody-picks${modeParam}`
              : `/pools/${poolId}${modeParam}`;
            router.push(target);
          }, 1000);
        } else {
          setSaveStatus("Saved!");
          setTimeout(() => {
            startNavigation();
            router.push("/brackets");
          }, 1000);
        }
        // Keep "Saving…" until redirect; don't setSaving(false)
      } else {
        setSaving(false);
        setSaveStatus(result.error ?? "Failed to save");
      }
    } catch {
      setSaving(false);
      setSaveStatus("Failed to save");
    }
  }

  const saveLabel =
    poolId && poolName
      ? hasSelectableGoodies
        ? `Save and submit to ${poolName} and continue to Goodie Selection`
        : `Save and submit to ${poolName}`
      : undefined;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-2 gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-stone-100 truncate">{bracketName}</h1>
        <div className="flex items-center gap-3 shrink-0">
          {locked && (
            <span className="text-sm px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
              Locked
            </span>
          )}
          {saveStatus && (
            <span
              className="text-base font-medium"
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
        bracketStructure={bracketStructure}
        initialPicks={initialPicks}
        bracketId={bracketId}
        readOnly={locked}
        onSave={locked ? undefined : handleSave}
        saving={saving}
        saveLabel={saveLabel}
      />
    </div>
  );
}
