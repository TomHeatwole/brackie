import { TournamentGame, FINAL_FOUR_MATCHUPS } from "./types";

/**
 * Given a game, find the next game it feeds into based on
 * round/position/region bracket structure.
 */
export function findNextGame(
  game: TournamentGame,
  allGames: TournamentGame[],
  finalFourMatchups: [string, string][]
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
    const ffIdx = finalFourMatchups.findIndex(
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

/**
 * Determines whether the feeder game's winner should populate
 * team1_id (true) or team2_id (false) on the next game.
 */
export function isTeam1Slot(
  nextGame: TournamentGame,
  feederGame: TournamentGame,
  finalFourMatchups: [string, string][] = FINAL_FOUR_MATCHUPS
): boolean {
  if (feederGame.round < 4 && feederGame.region) {
    return feederGame.position % 2 === 0;
  }
  if (feederGame.round === 4 && feederGame.region && nextGame.round === 5) {
    const matchup = finalFourMatchups[nextGame.position];
    return feederGame.region === matchup[0];
  }
  if (feederGame.round === 5 && nextGame.round === 6) {
    return feederGame.position === 0;
  }
  return true;
}

/**
 * Collect all downstream game IDs (transitive) from a given game,
 * walking the bracket towards the championship.
 */
export function getDownstreamGameIds(
  gameId: string,
  allGames: TournamentGame[],
  finalFourMatchups: [string, string][]
): string[] {
  const gameMap = new Map<string, TournamentGame>();
  for (const g of allGames) gameMap.set(g.id, g);

  const downstream: string[] = [];
  let current = gameMap.get(gameId);
  while (current) {
    const next = findNextGame(current, allGames, finalFourMatchups);
    if (!next) break;
    downstream.push(next.id);
    current = next;
  }
  return downstream;
}
