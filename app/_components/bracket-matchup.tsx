"use client";

import { Team } from "@/lib/types";
import TeamIcon from "./team-icon";

interface Props {
  team1: Team | null;
  team2: Team | null;
  pickedTeamId: string | null;
  onPick: (teamId: string) => void;
  readOnly: boolean;
  compact?: boolean;
}

function TeamSlot({
  team,
  isPicked,
  onClick,
  readOnly,
  position,
}: {
  team: Team | null;
  isPicked: boolean;
  onClick: () => void;
  readOnly: boolean;
  position: "top" | "bottom";
}) {
  const roundedClass = position === "top" ? "rounded-t" : "rounded-b";
  const borderClass = position === "top" ? "border-b-0" : "";

  if (!team) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] ${roundedClass} ${borderClass}`}
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--card-border)",
          width: "173px",
          height: "30px",
        }}
      >
        <span className="w-6 shrink-0" aria-hidden />
        <span className="text-stone-700 text-[12px] w-5 text-right">--</span>
        <span className="text-stone-700 truncate italic">TBD</span>
      </div>
    );
  }

  const canClick = !readOnly && !!team;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] ${roundedClass} ${borderClass} transition-all ${
        canClick ? "cursor-pointer" : ""
      }`}
      style={{
        backgroundColor: isPicked ? "var(--accent)" : "var(--card)",
        border: `1px solid ${isPicked ? "var(--accent)" : "var(--card-border)"}`,
        width: "173px",
        height: "30px",
        color: isPicked ? "#fff" : "var(--foreground)",
        boxShadow: isPicked ? "0 0 8px rgba(194, 85, 10, 0.25)" : "none",
      }}
      onMouseEnter={(e) => {
        if (canClick && !isPicked) {
          e.currentTarget.style.backgroundColor = "#1f1c19";
          e.currentTarget.style.borderColor = "var(--card-border-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (canClick && !isPicked) {
          e.currentTarget.style.backgroundColor = "var(--card)";
          e.currentTarget.style.borderColor = "var(--card-border)";
        }
      }}
    >
      <TeamIcon team={team} size="xs" className="shrink-0" />
      <span
        className="text-[12px] w-5 text-right font-semibold tabular-nums"
        style={{ color: isPicked ? "rgba(255,255,255,0.7)" : "var(--muted)" }}
      >
        {team.seed}
      </span>
      <span className="truncate font-medium min-w-0">{team.name}</span>
    </div>
  );
}

export default function BracketMatchup({
  team1,
  team2,
  pickedTeamId,
  onPick,
  readOnly,
}: Props) {
  return (
    <div className="flex flex-col">
      <TeamSlot
        team={team1}
        isPicked={!!team1 && pickedTeamId === team1.id}
        onClick={() => team1 && onPick(team1.id)}
        readOnly={readOnly}
        position="top"
      />
      <TeamSlot
        team={team2}
        isPicked={!!team2 && pickedTeamId === team2.id}
        onClick={() => team2 && onPick(team2.id)}
        readOnly={readOnly}
        position="bottom"
      />
    </div>
  );
}
