"use client";

import { useState } from "react";
import { Team, TournamentGame, ROUND_NAMES, BracketStructure, getBracketStructure } from "@/lib/types";
import type { PickStatus } from "./bracket-matchup";
import TeamIcon from "./team-icon";

interface Props {
  teams: Team[];
  games: TournamentGame[];
  /** When provided, defines region tab order and Final Four matchups */
  bracketStructure?: BracketStructure | null;
  picks: Record<string, string>;
  onPick: (gameId: string, teamId: string) => void;
  readOnly: boolean;
  renderMatchup?: (game: TournamentGame, team1: Team | null, team2: Team | null) => React.ReactNode;
  pickStatuses?: Map<string, PickStatus>;
}

type TabType = string | "Final Four";

function getTeamById(teams: Team[], id: string | null): Team | null {
  if (!id) return null;
  return teams.find((t) => t.id === id) ?? null;
}

function MobileStatusIcon({ status }: { status: "correct" | "wrong" | "dead" }) {
  if (status === "correct") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ opacity: status === "dead" ? 0.6 : 1 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function getMobilePickedStyles(status: PickStatus | null | undefined): {
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
        icon: <MobileStatusIcon status="correct" />,
      };
    case "wrong":
      return {
        bgColor: "rgba(239, 68, 68, 0.12)",
        borderColor: "rgba(239, 68, 68, 0.25)",
        textColor: "rgba(252, 165, 165, 0.7)",
        seedColor: "rgba(252, 165, 165, 0.4)",
        shadow: "none",
        strikethrough: true,
        icon: <MobileStatusIcon status="wrong" />,
      };
    case "dead":
      return {
        bgColor: "rgba(239, 68, 68, 0.06)",
        borderColor: "rgba(239, 68, 68, 0.15)",
        textColor: "rgba(252, 165, 165, 0.45)",
        seedColor: "rgba(252, 165, 165, 0.25)",
        shadow: "none",
        strikethrough: true,
        icon: <MobileStatusIcon status="dead" />,
      };
    default:
      return {
        bgColor: "var(--accent)",
        borderColor: "var(--accent)",
        textColor: "#fff",
        seedColor: "rgba(255,255,255,0.7)",
        shadow: "0 0 12px rgba(194, 85, 10, 0.2)",
        strikethrough: false,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ),
      };
  }
}

function MobileMatchup({
  team1,
  team2,
  pickedTeamId,
  onPick,
  readOnly,
  pickStatus,
}: {
  team1: Team | null;
  team2: Team | null;
  pickedTeamId: string | null;
  onPick: (teamId: string) => void;
  readOnly: boolean;
  pickStatus?: PickStatus | null;
}) {
  function TeamRow({ team, isPicked }: { team: Team | null; isPicked: boolean }) {
    if (!team) {
      return (
        <div className="flex items-center gap-3 px-3.5 py-3 bg-card border border-card-border first:rounded-t-lg last:rounded-b-lg first:border-b-0">
          <span className="w-6 shrink-0" aria-hidden />
          <span className="text-muted text-sm w-6 text-right font-mono">--</span>
          <span className="text-muted text-base italic">TBD</span>
        </div>
      );
    }

    const canClick = !readOnly && !!team;
    const styles = isPicked
      ? getMobilePickedStyles(pickStatus)
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
      <button
        type="button"
        onClick={canClick ? () => onPick(team.id) : undefined}
        disabled={!canClick}
        className={`flex items-center gap-3 px-3.5 py-3 w-full text-left transition-all first:rounded-t-lg last:rounded-b-lg first:border-b-0 ${
          canClick ? "active:scale-[0.98]" : ""
        }`}
        style={{
          backgroundColor: styles.bgColor,
          border: `1px solid ${styles.borderColor}`,
          color: styles.textColor,
          boxShadow: styles.shadow,
        }}
      >
        <TeamIcon team={team} size="sm" className="shrink-0" />
        <span
          className="text-sm w-6 text-right font-mono font-semibold tabular-nums"
          style={{ color: styles.seedColor }}
        >
          {team.seed}
        </span>
        <span className={`font-medium text-base flex-1 truncate ${styles.strikethrough ? "line-through" : ""}`}>
          {team.name}
        </span>
        {isPicked && styles.icon}
      </button>
    );
  }

  return (
    <div className="flex flex-col">
      <TeamRow team={team1} isPicked={!!team1 && pickedTeamId === team1.id} />
      <TeamRow team={team2} isPicked={!!team2 && pickedTeamId === team2.id} />
    </div>
  );
}

export default function BracketMobile({ teams, games, bracketStructure, picks, onPick, readOnly, renderMatchup, pickStatuses }: Props) {
  const structure = bracketStructure ?? getBracketStructure(null);
  const { regionsInOrder, finalFourMatchups } = structure;
  const [activeTab, setActiveTab] = useState<TabType>(regionsInOrder[0]);
  const [activeRound, setActiveRound] = useState(1);

  const isFinalFour = activeTab === "Final Four";

  const regionGames = isFinalFour
    ? games.filter((g) => g.round >= 5)
    : games.filter((g) => g.region === activeTab);

  const regionTeams = isFinalFour
    ? teams
    : teams.filter((t) => t.region === activeTab);

  const maxRound = isFinalFour ? 6 : 4;
  const minRound = isFinalFour ? 5 : 1;

  const currentRound = isFinalFour
    ? Math.max(minRound, Math.min(maxRound, activeRound))
    : Math.max(1, Math.min(4, activeRound));

  const roundGames = regionGames
    .filter((g) => g.round === currentRound)
    .sort((a, b) => a.position - b.position);

  const gamesByRound = new Map<number, TournamentGame[]>();
  for (const g of regionGames) {
    const list = gamesByRound.get(g.round) ?? [];
    list.push(g);
    gamesByRound.set(g.round, list);
  }
  for (const [, rg] of gamesByRound) rg.sort((a, b) => a.position - b.position);

  function resolveTeams(game: TournamentGame): [Team | null, Team | null] {
    if (game.round === 1) {
      return [getTeamById(regionTeams, game.team1_id), getTeamById(regionTeams, game.team2_id)];
    }

    if (game.round === 5) {
      const matchup = finalFourMatchups[game.position];
      if (!matchup) return [null, null];
      const e8_1 = games.find((g) => g.round === 4 && g.region === matchup[0]);
      const e8_2 = games.find((g) => g.round === 4 && g.region === matchup[1]);
      return [
        getTeamById(teams, e8_1 ? picks[e8_1.id] ?? null : null),
        getTeamById(teams, e8_2 ? picks[e8_2.id] ?? null : null),
      ];
    }

    if (game.round === 6) {
      const ffGames = games.filter((g) => g.round === 5).sort((a, b) => a.position - b.position);
      return [
        getTeamById(teams, ffGames[0] ? picks[ffGames[0].id] ?? null : null),
        getTeamById(teams, ffGames[1] ? picks[ffGames[1].id] ?? null : null),
      ];
    }

    const prevGames = gamesByRound.get(game.round - 1) ?? [];
    const feeder1 = prevGames.find((g) => g.position === game.position * 2);
    const feeder2 = prevGames.find((g) => g.position === game.position * 2 + 1);
    return [
      getTeamById(regionTeams, feeder1 ? picks[feeder1.id] ?? null : null),
      getTeamById(regionTeams, feeder2 ? picks[feeder2.id] ?? null : null),
    ];
  }

  const tabs: TabType[] = [...regionsInOrder, "Final Four"];
  const tabLabels: Record<string, string> = { "Final Four": "Final 4" };

  return (
    <div className="flex flex-col gap-3">
      {/* Region tabs */}
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setActiveRound(tab === "Final Four" ? 5 : 1);
            }}
            className={`px-1 py-2 rounded-lg text-[13px] font-medium transition-all text-center ${
              activeTab === tab
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-muted-foreground bg-card border border-card-border"
            }`}
          >
            {tabLabels[tab] ?? tab}
          </button>
        ))}
      </div>

      {/* Round selector */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setActiveRound((r) => Math.max(minRound, r - 1))}
          disabled={currentRound <= minRound}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-base font-medium text-stone-200">
          {ROUND_NAMES[currentRound] ?? `Round ${currentRound}`}
        </span>
        <button
          onClick={() => setActiveRound((r) => Math.min(maxRound, r + 1))}
          disabled={currentRound >= maxRound}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Matchups */}
      <div className="flex flex-col gap-3">
        {roundGames.map((game) => {
          const [t1, t2] = resolveTeams(game);
          return renderMatchup ? (
            <div key={game.id}>{renderMatchup(game, t1, t2)}</div>
          ) : (
            <MobileMatchup
              key={game.id}
              team1={t1}
              team2={t2}
              pickedTeamId={picks[game.id] ?? null}
              onPick={(teamId) => onPick(game.id, teamId)}
              readOnly={readOnly}
              pickStatus={pickStatuses?.get(game.id)}
            />
          );
        })}
        {roundGames.length === 0 && (
          <div className="text-center py-8 text-muted text-base">
            No games in this round
          </div>
        )}
      </div>

      {/* Champion display */}
      {isFinalFour && currentRound === 6 && (() => {
        const champGame = games.find((g) => g.round === 6);
        if (!champGame) return null;
        const winnerId = picks[champGame.id];
        const winner = winnerId ? getTeamById(teams, winnerId) : null;
        if (!winner) return null;

        const champStatus = pickStatuses?.get(champGame.id);
        let champBg = "var(--accent)";
        let champText = "#fff";
        let champShadow = "0 4px 14px rgba(194, 85, 10, 0.2)";
        let champLabelColor = "var(--accent)";
        let champStrike = false;

        if (champStatus === "correct") {
          champBg = "rgb(16, 185, 129)";
          champShadow = "0 4px 14px rgba(16, 185, 129, 0.3)";
          champLabelColor = "rgb(16, 185, 129)";
        } else if (champStatus === "wrong") {
          champBg = "rgba(239, 68, 68, 0.2)";
          champText = "rgba(252, 165, 165, 0.7)";
          champShadow = "none";
          champLabelColor = "rgba(252, 165, 165, 0.5)";
          champStrike = true;
        } else if (champStatus === "dead") {
          champBg = "rgba(239, 68, 68, 0.1)";
          champText = "rgba(252, 165, 165, 0.45)";
          champShadow = "none";
          champLabelColor = "rgba(252, 165, 165, 0.5)";
          champStrike = true;
        }

        return (
          <div className="text-center mt-2">
            <div
              className="text-[12px] uppercase tracking-widest mb-1.5 font-semibold"
              style={{ color: champLabelColor }}
            >
              Champion
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-bold"
              style={{
                backgroundColor: champBg,
                color: champText,
                boxShadow: champShadow,
              }}
            >
              <TeamIcon team={winner} size="sm" />
              <span className={champStrike ? "line-through" : ""}>
                ({winner.seed}) {winner.name}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
