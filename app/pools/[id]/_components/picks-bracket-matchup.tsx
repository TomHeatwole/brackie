"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Team, TournamentGame } from "@/lib/types";
import TeamIcon from "@/app/_components/team-icon";

export interface PickDistribution {
  /** teamId -> number of pool members who picked that team */
  counts: Map<string, number>;
  totalPickers: number;
}

export interface PickerDetail {
  name: string;
  status: "correct" | "wrong" | "dead" | null;
  pointsAwarded: number;
}

interface Props {
  game: TournamentGame;
  team1: Team | null;
  team2: Team | null;
  distribution: PickDistribution;
  /** teamId -> list of pickers for that team in this game */
  pickers: Map<string, PickerDetail[]>;
  /** Full team lookup so the tooltip can resolve teams even when tree can't */
  teamById: Map<string, Team>;
  /** Teams that have already been knocked out of the tournament */
  eliminatedTeamIds?: Set<string>;
}

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function teamHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

function FutureGameBar({
  distribution,
  teamById,
  eliminatedTeamIds,
}: {
  distribution: PickDistribution;
  teamById: Map<string, Team>;
  eliminatedTeamIds?: Set<string>;
}) {
  const { counts, totalPickers } = distribution;

  const entries = [...counts.entries()]
    .map(([teamId, count]) => ({
      team: teamById.get(teamId),
      count,
      pctNum: totalPickers > 0 ? (count / totalPickers) * 100 : 0,
      eliminated: eliminatedTeamIds?.has(teamId) ?? false,
    }))
    .filter(
      (e): e is { team: Team; count: number; pctNum: number; eliminated: boolean } =>
        e.team != null
    )
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      return b.count - a.count;
    });

  if (entries.length === 0) {
    return (
      <div
        className="flex items-center justify-center w-full md:w-[150px] rounded"
        style={{
          height: 59,
          backgroundColor: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <span className="text-stone-600 text-[13px] font-medium">?</span>
      </div>
    );
  }

  return (
    <div
      className="flex rounded overflow-hidden w-full md:w-[150px]"
      style={{ height: 59, border: "1px solid var(--card-border)" }}
    >
      {entries.map(({ team, pctNum, eliminated }, i) => {
        const hue = teamHue(team.name);
        const bg = eliminated
          ? `hsl(${hue}, 8%, 14%)`
          : `hsl(${hue}, 40%, 22%)`;
        const hatchOverlay = eliminated
          ? "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(239,68,68,0.12) 3px, rgba(239,68,68,0.12) 4px)"
          : undefined;

        return (
          <div
            key={team.id}
            className="flex flex-col items-center justify-center overflow-hidden"
            style={{
              width: `${Math.max(pctNum, 3)}%`,
              background: hatchOverlay ? `${hatchOverlay}, ${bg}` : bg,
              borderRight:
                i < entries.length - 1
                  ? "1px solid rgba(0,0,0,0.35)"
                  : undefined,
            }}
          >
            {pctNum >= 12 && (
              <TeamIcon
                team={team}
                size="xs"
                className={`shrink-0 ${eliminated ? "opacity-25 grayscale" : ""}`}
              />
            )}
            {pctNum >= 20 && (
              <span
                className={`text-[9px] font-bold tabular-nums mt-0.5 ${eliminated ? "line-through opacity-40" : ""}`}
                style={{ color: eliminated ? "rgba(252,165,165,0.5)" : `hsl(${hue}, 55%, 72%)` }}
              >
                {Math.round(pctNum)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamRow({
  team,
  count,
  total,
  isWinner,
  isLoser,
  position,
}: {
  team: Team | null;
  count: number;
  total: number;
  isWinner: boolean;
  isLoser: boolean;
  position: "top" | "bottom";
}) {
  const roundedClass = position === "top" ? "rounded-t" : "rounded-b";
  const borderClass = position === "top" ? "border-b-0" : "";
  const percentage = pct(count, total);

  if (!team) {
    return (
      <div
        className={`flex items-center justify-center gap-1 px-2 py-1 text-[12px] w-full md:w-[150px] h-[28px] md:h-[28px] ${roundedClass} ${borderClass}`}
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <span className="text-stone-600 text-[13px] font-medium">?</span>
      </div>
    );
  }

  let bgColor: string;
  let borderColor: string;
  let textColor: string;
  let seedColor: string;
  let pctColor: string;

  if (isWinner) {
    bgColor = "rgba(16, 185, 129, 0.15)";
    borderColor = "rgba(16, 185, 129, 0.3)";
    textColor = "rgb(167, 243, 208)";
    seedColor = "rgba(167, 243, 208, 0.6)";
    pctColor = "rgb(110, 231, 183)";
  } else if (isLoser) {
    bgColor = "rgba(239, 68, 68, 0.08)";
    borderColor = "rgba(239, 68, 68, 0.15)";
    textColor = "rgba(252, 165, 165, 0.5)";
    seedColor = "rgba(252, 165, 165, 0.3)";
    pctColor = "rgba(252, 165, 165, 0.4)";
  } else {
    bgColor = "var(--card)";
    borderColor = "var(--card-border)";
    textColor = "var(--foreground)";
    seedColor = "var(--muted)";
    pctColor = "var(--muted)";
  }

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 text-[12px] w-full md:w-[150px] h-[28px] md:h-[28px] ${roundedClass} ${borderClass}`}
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
      }}
    >
      <TeamIcon team={team} size="xs" className="shrink-0" />
      <span
        className="text-[11px] w-4 text-right font-semibold tabular-nums"
        style={{ color: seedColor }}
      >
        {team.seed}
      </span>
      <span className={`truncate font-medium min-w-0 flex-1 ${isLoser ? "line-through" : ""}`}>
        {team.name}
      </span>
      {total > 0 && (
        <span
          className="text-[10px] font-semibold tabular-nums shrink-0"
          style={{ color: pctColor }}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
}

const MAX_PICKERS_PER_COL = 10;

function PickerTooltipSection({
  team,
  pickerList,
  isWinner,
  isEliminated,
}: {
  team: Team;
  pickerList: PickerDetail[];
  isWinner: boolean | null;
  isEliminated?: boolean;
}) {
  if (pickerList.length === 0) return null;

  const sorted = [...pickerList].sort((a, b) => b.pointsAwarded - a.pointsAwarded);

  const columns: PickerDetail[][] = [];
  for (let i = 0; i < sorted.length; i += MAX_PICKERS_PER_COL) {
    columns.push(sorted.slice(i, i + MAX_PICKERS_PER_COL));
  }

  const isOut = isWinner === false || isEliminated;
  const teamNameClass = isOut
    ? "font-semibold text-red-300/60 text-[11px] line-through"
    : "font-semibold text-stone-100 text-[11px]";

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 min-w-0">
        <TeamIcon
          team={team}
          size="xs"
          className={`shrink-0 ${isOut ? "opacity-30 grayscale" : ""}`}
        />
        <span className={`${teamNameClass} truncate`}>
          ({team.seed}) {team.name}
        </span>
        <span className={`text-[10px] shrink-0 ${isOut ? "text-red-400/40" : "text-stone-500"}`}>
          ({pickerList.length})
        </span>
      </div>
      <div className="flex gap-3">
        {columns.map((col, ci) => (
          <div key={ci} className="space-y-0.5">
            {col.map((p, pi) => {
              let nameColor = isOut ? "text-red-300/40" : "text-stone-300";
              let ptsEl: React.ReactNode = null;
              if (p.status === "correct") {
                nameColor = "text-emerald-300";
                if (p.pointsAwarded > 0) {
                  ptsEl = (
                    <span className="tabular-nums text-emerald-400 text-[10px]">
                      +{p.pointsAwarded}
                    </span>
                  );
                }
              }

              return (
                <div key={pi} className="flex items-center gap-2">
                  <span className={`whitespace-nowrap ${nameColor} text-[11px]`}>
                    {p.name}
                  </span>
                  {ptsEl}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalTooltip({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; placement: "above" | "below" } | null>(null);

  const tooltipRef = useRef<HTMLDivElement>(null);

  const recompute = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const tooltipW = tooltipRef.current?.offsetWidth ?? 360;
    const margin = 6;

    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(4, Math.min(left, window.innerWidth - tooltipW - 4));

    const spaceAbove = rect.top;
    if (spaceAbove > 120) {
      setPos({ top: rect.top - margin, left, placement: "above" });
    } else {
      setPos({ top: rect.bottom + margin, left, placement: "below" });
    }
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open, recompute]);

  useLayoutEffect(() => {
    if (open && tooltipRef.current) recompute();
  });

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9999] w-max max-w-[calc(100vw-8px)] rounded-md border px-3 py-2.5 text-[11px] shadow-lg backdrop-blur-sm border-card-border bg-stone-950/95 pointer-events-none"
      style={{
        left: pos.left,
        ...(pos.placement === "above"
          ? { bottom: window.innerHeight - pos.top }
          : { top: pos.top }),
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default function PicksBracketMatchup({
  game,
  team1,
  team2,
  distribution,
  pickers,
  teamById,
  eliminatedTeamIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { counts, totalPickers } = distribution;
  const count1 = team1 ? (counts.get(team1.id) ?? 0) : 0;
  const count2 = team2 ? (counts.get(team2.id) ?? 0) : 0;

  const hasResult = game.winner_id != null;
  const isTeam1Winner = hasResult && game.winner_id === team1?.id;
  const isTeam2Winner = hasResult && game.winner_id === team2?.id;

  const pct1 = pct(count1, totalPickers);
  const pct2 = pct(count2, totalPickers);

  const hasPickers = pickers.size > 0;

  const tooltipSections: { team: Team; pickerList: PickerDetail[]; isWinner: boolean | null; isEliminated: boolean }[] = [];
  if (hasPickers) {
    const sortedTeamIds = [...pickers.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([tid]) => tid);
    for (const tid of sortedTeamIds) {
      const team = teamById.get(tid);
      if (!team) continue;
      const pickerList = pickers.get(tid) ?? [];
      if (pickerList.length === 0) continue;
      const isWinner = hasResult ? game.winner_id === tid : null;
      const isEliminated = eliminatedTeamIds?.has(tid) ?? false;
      tooltipSections.push({ team, pickerList, isWinner, isEliminated });
    }
  }


  return (
    <div
      ref={anchorRef}
      className="relative flex flex-col"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {!team1 && !team2 ? (
        <FutureGameBar distribution={distribution} teamById={teamById} eliminatedTeamIds={eliminatedTeamIds} />
      ) : (
        <>
          <TeamRow
            team={team1}
            count={count1}
            total={totalPickers}
            isWinner={isTeam1Winner}
            isLoser={hasResult && !isTeam1Winner}
            position="top"
          />
          {team1 && team2 && totalPickers > 0 && (
            <div className="flex h-[3px] overflow-hidden w-full md:w-[150px]">
              <div
                style={{
                  width: `${pct1}%`,
                  backgroundColor: hasResult
                    ? (isTeam1Winner ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)")
                    : "rgb(168, 162, 158)",
                  transition: "width 0.3s ease",
                }}
              />
              <div
                style={{
                  width: `${pct2}%`,
                  backgroundColor: hasResult
                    ? (isTeam2Winner ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)")
                    : "rgb(120, 113, 108)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
          <TeamRow
            team={team2}
            count={count2}
            total={totalPickers}
            isWinner={isTeam2Winner}
            isLoser={hasResult && !isTeam2Winner}
            position="bottom"
          />
        </>
      )}

      {tooltipSections.length > 0 && (
        <PortalTooltip anchorRef={anchorRef} open={open}>
          <div className="flex gap-x-5 gap-y-3">
            {tooltipSections.map((section) => (
              <PickerTooltipSection
                key={section.team.id}
                team={section.team}
                pickerList={section.pickerList}
                isWinner={section.isWinner}
                isEliminated={section.isEliminated}
              />
            ))}
          </div>
        </PortalTooltip>
      )}
    </div>
  );
}
