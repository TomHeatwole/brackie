"use client";

import { Team, TournamentGame } from "@/lib/types";
import BracketMatchup from "./bracket-matchup";

interface Props {
  region: string;
  games: TournamentGame[];
  teams: Team[];
  picks: Record<string, string>;
  onPick: (gameId: string, teamId: string) => void;
  direction: "ltr" | "rtl";
  readOnly: boolean;
}

function getTeamById(teams: Team[], id: string | null): Team | null {
  if (!id) return null;
  return teams.find((t) => t.id === id) ?? null;
}

const TOTAL_HEIGHT = 552; /* ~15% larger than 480 */
const CONNECTOR_WIDTH = 23;

function slotHeight(round: number): number {
  const gamesInRound = 8 / Math.pow(2, round - 1);
  return TOTAL_HEIGHT / gamesInRound;
}

export default function BracketRegion({
  games,
  teams,
  picks,
  onPick,
  direction,
  readOnly,
}: Props) {
  const gamesByRound = new Map<number, TournamentGame[]>();
  for (const game of games) {
    const list = gamesByRound.get(game.round) ?? [];
    list.push(game);
    gamesByRound.set(game.round, list);
  }
  for (const [, roundGames] of gamesByRound) {
    roundGames.sort((a, b) => a.position - b.position);
  }

  function resolveTeams(game: TournamentGame): [Team | null, Team | null] {
    if (game.round === 1) {
      return [getTeamById(teams, game.team1_id), getTeamById(teams, game.team2_id)];
    }
    const prevGames = gamesByRound.get(game.round - 1) ?? [];
    const feeder1 = prevGames.find((g) => g.position === game.position * 2);
    const feeder2 = prevGames.find((g) => g.position === game.position * 2 + 1);
    return [
      getTeamById(teams, feeder1 ? picks[feeder1.id] ?? null : null),
      getTeamById(teams, feeder2 ? picks[feeder2.id] ?? null : null),
    ];
  }

  const isLtr = direction === "ltr";
  const rounds = [1, 2, 3, 4];
  const orderedRounds = isLtr ? rounds : [...rounds].reverse();

  function renderRound(round: number) {
    const roundGames = gamesByRound.get(round) ?? [];
    const sh = slotHeight(round);
    return (
      <div key={`r${round}`} className="flex flex-col shrink-0" style={{ height: TOTAL_HEIGHT }}>
        {roundGames.map((game) => {
          const [team1, team2] = resolveTeams(game);
          return (
            <div key={game.id} className="flex items-center justify-center" style={{ height: sh }}>
              <BracketMatchup
                team1={team1}
                team2={team2}
                pickedTeamId={picks[game.id] ?? null}
                onPick={(teamId) => onPick(game.id, teamId)}
                readOnly={readOnly}
              />
            </div>
          );
        })}
      </div>
    );
  }

  function renderConnector(sourceRound: number) {
    const targetRound = sourceRound + 1;
    const targetGames = gamesByRound.get(targetRound) ?? [];
    const targetSlotH = slotHeight(targetRound);
    const padding = slotHeight(sourceRound) / 2;

    return (
      <div
        key={`c${sourceRound}`}
        className="flex flex-col shrink-0"
        style={{ height: TOTAL_HEIGHT, width: CONNECTOR_WIDTH }}
      >
        {targetGames.map((_, i) => (
          <div key={i} style={{ height: targetSlotH, paddingTop: padding, paddingBottom: padding, boxSizing: "border-box" }}>
            <div className="h-full flex flex-col">
              <div
                className="flex-1"
                style={{
                  [isLtr ? "borderRight" : "borderLeft"]: "1px solid var(--card-border-hover)",
                  borderTop: "1px solid var(--card-border-hover)",
                }}
              />
              <div
                className="flex-1"
                style={{
                  [isLtr ? "borderRight" : "borderLeft"]: "1px solid var(--card-border-hover)",
                  borderBottom: "1px solid var(--card-border-hover)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < orderedRounds.length; i++) {
    if (i > 0) {
      const sourceRound = isLtr
        ? orderedRounds[i - 1]
        : orderedRounds[i];
      elements.push(renderConnector(sourceRound));
    }
    elements.push(renderRound(orderedRounds[i]));
  }

  return <div className="flex items-stretch">{elements}</div>;
}
