"use client";

import { Team } from "@/lib/types";
import TeamIcon from "./team-icon";

export type PickStatus = "correct" | "wrong" | "dead" | "pending";

interface Props {
  team1: Team | null;
  team2: Team | null;
  pickedTeamId: string | null;
  onPick: (teamId: string) => void;
  readOnly: boolean;
  compact?: boolean;
  pickStatus?: PickStatus | null;
  eliminatedTeamIds?: Set<string>;
}

function StatusIcon({ status }: { status: "correct" | "wrong" | "dead" }) {
  if (status === "correct") {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ opacity: status === "dead" ? 0.6 : 1 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function getPickedStyles(status: PickStatus | null | undefined): {
  bgColor: string;
  borderColor: string;
  textColor: string;
  seedColor: string;
  shadow: string;
  strikethrough: boolean;
  icon: React.ReactNode;
} {
  switch (status) {
    case "correct":
      return {
        bgColor: "rgba(16, 185, 129, 0.18)",
        borderColor: "rgba(16, 185, 129, 0.35)",
        textColor: "rgb(167, 243, 208)",
        seedColor: "rgba(167, 243, 208, 0.6)",
        shadow: "none",
        strikethrough: false,
        icon: <StatusIcon status="correct" />,
      };
    case "wrong":
      return {
        bgColor: "rgba(239, 68, 68, 0.12)",
        borderColor: "rgba(239, 68, 68, 0.25)",
        textColor: "rgba(252, 165, 165, 0.7)",
        seedColor: "rgba(252, 165, 165, 0.4)",
        shadow: "none",
        strikethrough: true,
        icon: <StatusIcon status="wrong" />,
      };
    case "dead":
      return {
        bgColor: "rgba(239, 68, 68, 0.06)",
        borderColor: "rgba(239, 68, 68, 0.15)",
        textColor: "rgba(252, 165, 165, 0.45)",
        seedColor: "rgba(252, 165, 165, 0.25)",
        shadow: "none",
        strikethrough: true,
        icon: <StatusIcon status="dead" />,
      };
    default:
      return {
        bgColor: "var(--accent)",
        borderColor: "var(--accent)",
        textColor: "#fff",
        seedColor: "rgba(255,255,255,0.7)",
        shadow: "0 0 8px rgba(194, 85, 10, 0.25)",
        strikethrough: false,
        icon: null,
      };
  }
}

function TeamSlot({
  team,
  isPicked,
  pickStatus,
  onClick,
  readOnly,
  position,
  eliminatedTeamIds,
}: {
  team: Team | null;
  isPicked: boolean;
  pickStatus?: PickStatus | null;
  onClick: () => void;
  readOnly: boolean;
  position: "top" | "bottom";
  eliminatedTeamIds?: Set<string>;
}) {
  const roundedClass = position === "top" ? "rounded-t" : "rounded-b";
  const borderClass = position === "top" ? "border-b-0" : "";

  if (!team) {
    return (
      <div
        className={`flex items-center gap-1 px-2 py-1 text-[12px] ${roundedClass} ${borderClass}`}
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--card-border)",
          width: "150px",
          height: "28px",
        }}
      >
        <span className="w-4 shrink-0" aria-hidden />
        <span className="text-stone-700 text-[11px] w-5 text-right">--</span>
        <span className="text-stone-700 truncate italic">TBD</span>
      </div>
    );
  }

  const canClick = !readOnly && !!team;
  const isEliminated = !isPicked && !!team && !!eliminatedTeamIds?.has(team.id);
  const styles = isPicked
    ? getPickedStyles(pickStatus)
    : isEliminated
      ? {
          bgColor: "var(--card)",
          borderColor: "var(--card-border)",
          textColor: "rgba(252, 165, 165, 0.45)",
          seedColor: "rgba(252, 165, 165, 0.25)",
          shadow: "none",
          strikethrough: true,
          icon: null,
        }
      : {
          bgColor: "var(--card)",
          borderColor: "var(--card-border)",
          textColor: "var(--foreground)",
          seedColor: "var(--muted)",
          shadow: "none",
          strikethrough: false,
          icon: null,
        };

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`flex items-center gap-1 px-2 py-1 text-[12px] ${roundedClass} ${borderClass} transition-all ${
        canClick ? "cursor-pointer" : ""
      }`}
      style={{
        backgroundColor: styles.bgColor,
        border: `1px solid ${styles.borderColor}`,
        width: "150px",
        height: "28px",
        color: styles.textColor,
        boxShadow: styles.shadow,
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
        className="text-[11px] w-4 text-right font-semibold tabular-nums"
        style={{ color: styles.seedColor }}
      >
        {team.seed}
      </span>
      <span className={`truncate font-medium min-w-0 flex-1 ${styles.strikethrough ? "line-through" : ""}`}>
        {team.name}
      </span>
      {isPicked && styles.icon}
    </div>
  );
}

export default function BracketMatchup({
  team1,
  team2,
  pickedTeamId,
  onPick,
  readOnly,
  pickStatus,
  eliminatedTeamIds,
}: Props) {
  return (
    <div className="flex flex-col">
      <TeamSlot
        team={team1}
        isPicked={!!team1 && pickedTeamId === team1.id}
        pickStatus={pickStatus}
        onClick={() => team1 && onPick(team1.id)}
        readOnly={readOnly}
        position="top"
        eliminatedTeamIds={eliminatedTeamIds}
      />
      <TeamSlot
        team={team2}
        isPicked={!!team2 && pickedTeamId === team2.id}
        pickStatus={pickStatus}
        onClick={() => team2 && onPick(team2.id)}
        readOnly={readOnly}
        position="bottom"
        eliminatedTeamIds={eliminatedTeamIds}
      />
    </div>
  );
}
