"use client";

import { Team } from "@/lib/types";

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
        className={`flex items-center gap-1.5 px-2 py-1 text-xs ${roundedClass} ${borderClass}`}
        style={{
          backgroundColor: "#1c1a18",
          border: "1px solid #2a2725",
          minWidth: "150px",
          height: "24px",
        }}
      >
        <span className="text-stone-700 text-[10px] w-4 text-right">--</span>
        <span className="text-stone-700 truncate">TBD</span>
      </div>
    );
  }

  const canClick = !readOnly && !!team;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`flex items-center gap-1.5 px-2 py-1 text-xs ${roundedClass} ${borderClass} transition-colors ${
        canClick ? "cursor-pointer" : ""
      }`}
      style={{
        backgroundColor: isPicked ? "#AE4E02" : "#1c1a18",
        border: `1px solid ${isPicked ? "#AE4E02" : "#2a2725"}`,
        minWidth: "150px",
        height: "24px",
        color: isPicked ? "#fff" : "#e7e5e4",
      }}
      onMouseEnter={(e) => {
        if (canClick && !isPicked) {
          e.currentTarget.style.backgroundColor = "#292524";
          e.currentTarget.style.borderColor = "#44403c";
        }
      }}
      onMouseLeave={(e) => {
        if (canClick && !isPicked) {
          e.currentTarget.style.backgroundColor = "#1c1a18";
          e.currentTarget.style.borderColor = "#2a2725";
        }
      }}
    >
      <span
        className="text-[10px] w-4 text-right font-medium"
        style={{ color: isPicked ? "rgba(255,255,255,0.7)" : "#78716c" }}
      >
        {team.seed}
      </span>
      <span className="truncate font-medium">{team.name}</span>
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
