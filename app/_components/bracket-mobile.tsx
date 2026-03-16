"use client";

import { useState } from "react";
import { Team, TournamentGame, ROUND_NAMES, BracketStructure, getBracketStructure } from "@/lib/types";
import TeamIcon from "./team-icon";

interface Props {
  teams: Team[];
  games: TournamentGame[];
  /** When provided, defines region tab order and Final Four matchups */
  bracketStructure?: BracketStructure | null;
  picks: Record<string, string>;
  onPick: (gameId: string, teamId: string) => void;
  readOnly: boolean;
}

type TabType = string | "Final Four";

function getTeamById(teams: Team[], id: string | null): Team | null {
  if (!id) return null;
  return teams.find((t) => t.id === id) ?? null;
}

function MobileMatchup({
  team1,
  team2,
  pickedTeamId,
  onPick,
  readOnly,
}: {
  team1: Team | null;
  team2: Team | null;
  pickedTeamId: string | null;
  onPick: (teamId: string) => void;
  readOnly: boolean;
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

    return (
      <button
        type="button"
        onClick={canClick ? () => onPick(team.id) : undefined}
        disabled={!canClick}
        className={`flex items-center gap-3 px-3.5 py-3 w-full text-left transition-all first:rounded-t-lg last:rounded-b-lg first:border-b-0 ${
          canClick ? "active:scale-[0.98]" : ""
        }`}
        style={{
          backgroundColor: isPicked ? "var(--accent)" : "var(--card)",
          border: `1px solid ${isPicked ? "var(--accent)" : "var(--card-border)"}`,
          color: isPicked ? "#fff" : "var(--foreground)",
          boxShadow: isPicked ? "0 0 12px rgba(194, 85, 10, 0.2)" : "none",
        }}
      >
        <TeamIcon team={team} size="sm" className="shrink-0" />
        <span
          className="text-sm w-6 text-right font-mono font-semibold tabular-nums"
          style={{ color: isPicked ? "rgba(255,255,255,0.7)" : "var(--muted)" }}
        >
          {team.seed}
        </span>
        <span className="font-medium text-base flex-1 truncate">{team.name}</span>
        {isPicked && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
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

export default function BracketMobile({ teams, games, bracketStructure, picks, onPick, readOnly }: Props) {
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
          return (
            <MobileMatchup
              key={game.id}
              team1={t1}
              team2={t2}
              pickedTeamId={picks[game.id] ?? null}
              onPick={(teamId) => onPick(game.id, teamId)}
              readOnly={readOnly}
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
        return (
          <div className="text-center mt-2">
            <div className="text-[12px] text-accent uppercase tracking-widest mb-1.5 font-semibold">
              Champion
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-bold bg-accent text-white shadow-lg shadow-accent/20">
              <TeamIcon team={winner} size="sm" />
              <span>({winner.seed}) {winner.name}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
