"use client";

import { useState } from "react";
import { Team, TournamentGame } from "@/lib/types";
import BracketTree from "@/app/_components/bracket-tree";
import { saveBracketPicksAction } from "@/app/brackets/create/actions";

interface Props {
  bracketId: string;
  bracketName: string;
  teams: Team[];
  games: TournamentGame[];
  initialPicks: Record<string, string>;
  locked: boolean;
}

export default function BracketEditor({
  bracketId,
  bracketName,
  teams,
  games,
  initialPicks,
  locked,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  async function handleSave(picks: Record<string, string>) {
    setSaving(true);
    setSaveStatus(null);
    const result = await saveBracketPicksAction(bracketId, picks);
    setSaving(false);
    if (result.success) {
      setSaveStatus("Saved!");
      setTimeout(() => setSaveStatus(null), 2000);
    } else {
      setSaveStatus(result.error ?? "Failed to save");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 px-2">
        <h1 className="text-xl font-semibold text-stone-100">{bracketName}</h1>
        {locked && (
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#292524", color: "#f87171" }}>
            Locked — Tournament has started
          </span>
        )}
        {saveStatus && (
          <span
            className="text-sm"
            style={{ color: saveStatus === "Saved!" ? "#4ade80" : "#f87171" }}
          >
            {saveStatus}
          </span>
        )}
      </div>
      <BracketTree
        teams={teams}
        games={games}
        initialPicks={initialPicks}
        readOnly={locked}
        onSave={locked ? undefined : handleSave}
        saving={saving}
      />
    </div>
  );
}
