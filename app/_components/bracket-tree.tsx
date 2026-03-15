"use client";

import { useState, useCallback } from "react";
import { Team, TournamentGame, REGIONS, FINAL_FOUR_MATCHUPS, Region } from "@/lib/types";
import BracketRegion from "./bracket-region";
import BracketFinalFour from "./bracket-final-four";

interface Props {
  teams: Team[];
  games: TournamentGame[];
  initialPicks?: Record<string, string>;
  readOnly?: boolean;
  onSave?: (picks: Record<string, string>) => void;
  saving?: boolean;
}

function buildGameMap(games: TournamentGame[]): Map<string, TournamentGame> {
  const map = new Map<string, TournamentGame>();
  for (const g of games) map.set(g.id, g);
  return map;
}

function getDownstreamGameIds(
  gameId: string,
  gameMap: Map<string, TournamentGame>,
  allGames: TournamentGame[]
): string[] {
  const game = gameMap.get(gameId);
  if (!game) return [];

  const downstream: string[] = [];
  const nextGame = findNextGame(game, allGames);
  if (nextGame) {
    downstream.push(nextGame.id);
    downstream.push(...getDownstreamGameIds(nextGame.id, gameMap, allGames));
  }
  return downstream;
}

function findNextGame(
  game: TournamentGame,
  allGames: TournamentGame[]
): TournamentGame | null {
  if (game.round === 6) return null;

  if (game.round < 4 && game.region) {
    const nextRound = game.round + 1;
    const nextPos = Math.floor(game.position / 2);
    return (
      allGames.find(
        (g) =>
          g.round === nextRound &&
          g.region === game.region &&
          g.position === nextPos
      ) ?? null
    );
  }

  if (game.round === 4 && game.region) {
    const ffIdx = FINAL_FOUR_MATCHUPS.findIndex(
      ([a, b]) => a === game.region || b === game.region
    );
    if (ffIdx >= 0) {
      return (
        allGames.find((g) => g.round === 5 && g.position === ffIdx) ?? null
      );
    }
  }

  if (game.round === 5) {
    return allGames.find((g) => g.round === 6) ?? null;
  }

  return null;
}

export default function BracketTree({
  teams,
  games,
  initialPicks = {},
  readOnly = false,
  onSave,
  saving = false,
}: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const gameMap = buildGameMap(games);

  const handlePick = useCallback(
    (gameId: string, teamId: string) => {
      if (readOnly) return;

      setPicks((prev) => {
        const next = { ...prev };

        if (next[gameId] === teamId) return prev;

        const oldPick = next[gameId];
        next[gameId] = teamId;

        if (oldPick && oldPick !== teamId) {
          const downstreamIds = getDownstreamGameIds(gameId, gameMap, games);
          for (const dsId of downstreamIds) {
            if (next[dsId] === oldPick) {
              delete next[dsId];
            }
          }
        }

        return next;
      });
    },
    [readOnly, gameMap, games]
  );

  const pickCount = Object.keys(picks).length;

  const regionGames = (region: string) =>
    games.filter((g) => g.region === region);
  const regionTeams = (region: string) =>
    teams.filter((t) => t.region === region);
  const finalGames = games.filter((g) => g.round >= 5);

  const leftTop = REGIONS[0];
  const rightTop = REGIONS[1];
  const leftBottom = REGIONS[2];
  const rightBottom = REGIONS[3];

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2">
        <div className="text-stone-400 text-sm">
          {pickCount}/63 picks
          {pickCount === 63 && (
            <span className="ml-2" style={{ color: "#4ade80" }}>
              Complete!
            </span>
          )}
        </div>
        {onSave && !readOnly && (
          <button
            onClick={() => onSave(picks)}
            disabled={saving}
            className="px-4 py-1.5 rounded text-sm font-medium text-white transition-colors disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: "#AE4E02" }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.backgroundColor = "#8a3e01";
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.backgroundColor = "#AE4E02";
            }}
          >
            {saving ? "Saving…" : "Save Bracket"}
          </button>
        )}
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex flex-col gap-2 min-w-fit">
          {/* Top half: leftTop region + FF + rightTop region */}
          <div className="flex items-stretch">
            <div className="shrink-0">
              <div
                className="text-[10px] uppercase tracking-wider text-center mb-1 font-medium"
                style={{ color: "#AE4E02" }}
              >
                {leftTop}
              </div>
              <BracketRegion
                region={leftTop}
                games={regionGames(leftTop)}
                teams={regionTeams(leftTop)}
                picks={picks}
                onPick={handlePick}
                direction="ltr"
                readOnly={readOnly}
              />
            </div>

            <div className="shrink-0 flex items-center">
              <BracketFinalFour
                games={finalGames}
                allGames={games}
                teams={teams}
                picks={picks}
                onPick={handlePick}
                readOnly={readOnly}
              />
            </div>

            <div className="shrink-0">
              <div
                className="text-[10px] uppercase tracking-wider text-center mb-1 font-medium"
                style={{ color: "#AE4E02" }}
              >
                {rightTop}
              </div>
              <BracketRegion
                region={rightTop}
                games={regionGames(rightTop)}
                teams={regionTeams(rightTop)}
                picks={picks}
                onPick={handlePick}
                direction="rtl"
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Bottom half: leftBottom region + spacer + rightBottom region */}
          <div className="flex items-stretch">
            <div className="shrink-0">
              <div
                className="text-[10px] uppercase tracking-wider text-center mb-1 font-medium"
                style={{ color: "#AE4E02" }}
              >
                {leftBottom}
              </div>
              <BracketRegion
                region={leftBottom}
                games={regionGames(leftBottom)}
                teams={regionTeams(leftBottom)}
                picks={picks}
                onPick={handlePick}
                direction="ltr"
                readOnly={readOnly}
              />
            </div>

            {/* Spacer to match Final Four width */}
            <div className="shrink-0" style={{ width: "200px" }} />

            <div className="shrink-0">
              <div
                className="text-[10px] uppercase tracking-wider text-center mb-1 font-medium"
                style={{ color: "#AE4E02" }}
              >
                {rightBottom}
              </div>
              <BracketRegion
                region={rightBottom}
                games={regionGames(rightBottom)}
                teams={regionTeams(rightBottom)}
                picks={picks}
                onPick={handlePick}
                direction="rtl"
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
