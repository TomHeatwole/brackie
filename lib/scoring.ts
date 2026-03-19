import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PoolWithDetails,
  BracketWithPicks,
  TournamentGame,
  Team,
  RoundPoints,
  UpsetMultipliers,
} from "./types";
import { GAMES_PER_ROUND, SEED_MATCHUPS, getBracketStructure } from "./types";
import { getTournament, getGames, getTeams } from "./tournament";

export interface PerRoundScore {
  gamesPlayed: number;
  gamesCorrect: number;
  basePoints: number;
  upsetPoints: number;
  totalPoints: number;
  /** Games in this round that are either scored already or became impossible due to earlier wrong picks. */
  evaluatedGames: RoundGameEvaluation[];
}

export type RoundGameStatus = "correct" | "wrong" | "dead";

export interface RoundGameEvaluation {
  gameId: string;
  pickedTeamId: string | null;
  status: RoundGameStatus;
  /** Points awarded right now (0 for wrong/dead or unscored games). */
  pointsAwarded: number;
  /** Points this pick would be worth if it were correct (used for "missing" tooltip). */
  pointsIfCorrect: number;
}

export interface BracketScoreSummary {
  bracketId: string;
  userId: string;
  perRound: Record<number, PerRoundScore>;
  totalBracketPoints: number;
  totalGoodyPoints: number;
  totalPoints: number;
  possiblePoints: number;
}

interface PoolScoringContext {
  pool: PoolWithDetails;
  games: TournamentGame[];
  teams: Team[];
  brackets: BracketWithPicks[];
  finalFourMatchups: [string, string][];
}

export async function buildPoolScoringContext(
  supabase: SupabaseClient,
  pool: PoolWithDetails,
  options: { testMode: boolean }
): Promise<PoolScoringContext> {
  const { testMode } = options;

  const tournament = await getTournament(supabase, pool.tournament_id, testMode);
  if (!tournament) {
    return { pool, games: [], teams: [], brackets: [], finalFourMatchups: [] };
  }

  const [games, teams] = await Promise.all([
    getGames(supabase, pool.tournament_id, testMode),
    getTeams(supabase, pool.tournament_id, testMode),
  ]);

  const { data: poolBrackets } = await supabase
    .from("pool_brackets")
    .select("bracket_id, user_id")
    .eq("pool_id", pool.id);

  const bracketIds = (poolBrackets ?? []).map((pb) => pb.bracket_id);
  if (bracketIds.length === 0) {
    return { pool, games, teams, brackets: [], finalFourMatchups: getBracketStructure(tournament).finalFourMatchups };
  }

  const { data: bracketsRows } = await supabase
    .from("brackets")
    .select("*")
    .in("id", bracketIds);

  if (!bracketsRows || bracketsRows.length === 0) {
    return { pool, games, teams, brackets: [], finalFourMatchups: getBracketStructure(tournament).finalFourMatchups };
  }

  const { data: picks } = await supabase
    .from("bracket_picks")
    .select("*")
    .in("bracket_id", bracketIds);

  const picksByBracket = new Map<string, { game_id: string; picked_team_id: string }[]>();
  for (const p of picks ?? []) {
    const list = picksByBracket.get(p.bracket_id) ?? [];
    list.push({ game_id: p.game_id, picked_team_id: p.picked_team_id });
    picksByBracket.set(p.bracket_id, list);
  }

  const poolBracketsByBracketId = new Map<string, { user_id: string }>();
  for (const pb of poolBrackets ?? []) {
    poolBracketsByBracketId.set(pb.bracket_id, { user_id: pb.user_id });
  }

  const brackets: BracketWithPicks[] = (bracketsRows as any[]).map((b) => ({
    ...b,
    picks: picksByBracket.get(b.id) ?? [],
    pick_count: picksByBracket.get(b.id)?.length ?? 0,
  }));

  return {
    pool,
    games,
    teams,
    brackets,
    finalFourMatchups: getBracketStructure(tournament).finalFourMatchups,
  };
}

function buildTeamSeedMap(teams: Team[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of teams) {
    map.set(t.id, t.seed);
  }
  return map;
}

function buildGamesById(games: TournamentGame[]): Map<string, TournamentGame> {
  const map = new Map<string, TournamentGame>();
  for (const g of games) {
    map.set(g.id, g);
  }
  return map;
}

function getRoundPointsFor(pool: PoolWithDetails, round: number): number {
  const key = String(round);
  const roundPoints: RoundPoints = pool.round_points ?? {};
  return roundPoints[key] ?? 0;
}

function getUpsetMultiplierFor(pool: PoolWithDetails, round: number): number {
  const key = String(round);
  const multipliers: UpsetMultipliers = pool.upset_multipliers ?? {};
  return multipliers[key] ?? 0;
}

function buildGameIndex(games: TournamentGame[]) {
  const byRoundRegionPos = new Map<string, TournamentGame>();
  const byRoundPos = new Map<string, TournamentGame>();

  for (const g of games) {
    if (g.round >= 1 && g.round <= 4) {
      const region = g.region ?? "";
      byRoundRegionPos.set(`${g.round}|${region}|${g.position}`, g);
    } else {
      byRoundPos.set(`${g.round}|${g.position}`, g);
    }
  }

  return { byRoundRegionPos, byRoundPos };
}

function getFeederIdsForGame(
  game: TournamentGame,
  ctx: { games: TournamentGame[]; finalFourMatchups: [string, string][] },
  index: ReturnType<typeof buildGameIndex>
): [string, string] | null {
  if (game.round === 1) return null;

  if (game.round >= 2 && game.round <= 4) {
    const region = game.region ?? "";
    const feeder1 = index.byRoundRegionPos.get(`${game.round - 1}|${region}|${game.position * 2}`);
    const feeder2 = index.byRoundRegionPos.get(`${game.round - 1}|${region}|${game.position * 2 + 1}`);
    if (!feeder1 || !feeder2) return null;
    return [feeder1.id, feeder2.id];
  }

  if (game.round === 5) {
    const matchup = ctx.finalFourMatchups[game.position];
    if (!matchup) return null;
    const [regionA, regionB] = matchup;

    const round4A = ctx.games.find((g) => g.round === 4 && g.region === regionA && g.position === 0) ??
      ctx.games.find((g) => g.round === 4 && g.region === regionA);
    const round4B = ctx.games.find((g) => g.round === 4 && g.region === regionB && g.position === 0) ??
      ctx.games.find((g) => g.round === 4 && g.region === regionB);

    if (!round4A || !round4B) return null;
    return [round4A.id, round4B.id];
  }

  if (game.round === 6) {
    const feeder5_0 = index.byRoundPos.get(`5|0`);
    const feeder5_1 = index.byRoundPos.get(`5|1`);
    if (!feeder5_0 || !feeder5_1) return null;
    return [feeder5_0.id, feeder5_1.id];
  }

  return null;
}

function computeChalkSeedForGame(
  game: TournamentGame,
  teamSeedsById: Map<string, number>
): number | null {
  if (game.round === 1 && game.team1_id && teamSeedsById.has(game.team1_id)) {
    return teamSeedsById.get(game.team1_id) ?? null;
  }

  if (game.round === 1) return null;

  const gamesInRound = GAMES_PER_ROUND[game.round];
  const index = game.position;
  if (gamesInRound === undefined) return null;

  const regionSeedMapping = SEED_MATCHUPS;
  if (!regionSeedMapping || regionSeedMapping.length === 0) return null;

  function chalkSeedForSlot(round: number, position: number): number | null {
    if (round === 1) {
      const [seedA] = regionSeedMapping[position] ?? [];
      return seedA ?? null;
    }
    const prevRoundGames = GAMES_PER_ROUND[round - 1];
    if (!prevRoundGames) return null;
    const feederA = chalkSeedForSlot(round - 1, position * 2);
    const feederB = chalkSeedForSlot(round - 1, position * 2 + 1);
    if (feederA == null || feederB == null) return null;
    return Math.min(feederA, feederB);
  }

  return chalkSeedForSlot(game.round, index);
}

function isUpset(
  winnerTeamId: string,
  game: TournamentGame,
  teamSeedsById: Map<string, number>
): { isUpset: boolean; seedDifferential: number } {
  const winnerSeed = teamSeedsById.get(winnerTeamId);
  if (winnerSeed == null) return { isUpset: false, seedDifferential: 0 };

  const chalkSeed = computeChalkSeedForGame(game, teamSeedsById);
  if (chalkSeed == null) return { isUpset: false, seedDifferential: 0 };

  const diff = winnerSeed - chalkSeed;
  if (diff <= 0) return { isUpset: false, seedDifferential: 0 };
  return { isUpset: true, seedDifferential: diff };
}

export function scoreBracketsForPool(ctx: PoolScoringContext): BracketScoreSummary[] {
  const { pool, games, teams, brackets } = ctx;
  if (games.length === 0 || teams.length === 0 || brackets.length === 0) {
    return [];
  }

  const teamSeedsById = buildTeamSeedMap(teams);
  const gameIndex = buildGameIndex(games);

  const summaries: BracketScoreSummary[] = [];

  for (const bracket of brackets) {
    const perRound: Record<number, PerRoundScore> = {};
    const possiblePerRound: Record<number, number> = {};
    for (let r = 1; r <= 6; r++) {
      perRound[r] = {
        gamesPlayed: 0,
        gamesCorrect: 0,
        basePoints: 0,
        upsetPoints: 0,
        totalPoints: 0,
        evaluatedGames: [],
      };
      possiblePerRound[r] = 0;
    }

    const pickMap = new Map<string, string>();
    for (const p of bracket.picks) {
      pickMap.set(p.game_id, p.picked_team_id);
    }

    // aliveForPick determines whether, given actual results so far,
    // the user's selected team for each game could still be correct.
    const aliveForPick = new Map<string, boolean>();

    // Precompute alive in round order so each game can reference its feeders.
    const gamesByRound = new Map<number, TournamentGame[]>();
    for (const g of games) {
      const list = gamesByRound.get(g.round) ?? [];
      list.push(g);
      gamesByRound.set(g.round, list);
    }

    for (let r = 1; r <= 6; r++) {
      const roundGames = gamesByRound.get(r) ?? [];
      for (const game of roundGames) {
        const pickedTeamId = pickMap.get(game.id);
        if (!pickedTeamId) {
          aliveForPick.set(game.id, false);
          continue;
        }

        if (game.round === 1) {
          // If already played and wrong, dead. If unplayed, treat as alive for "possible" math.
          if (game.winner_id == null) {
            aliveForPick.set(game.id, true);
          } else {
            aliveForPick.set(game.id, pickedTeamId === game.winner_id);
          }
          continue;
        }

        const feederIds = getFeederIdsForGame(
          game,
          { games, finalFourMatchups: ctx.finalFourMatchups },
          gameIndex
        );
        if (!feederIds) {
          aliveForPick.set(game.id, false);
          continue;
        }
        const [feeder1Id, feeder2Id] = feederIds;
        const feeder1Pick = pickMap.get(feeder1Id) ?? null;
        const feeder2Pick = pickMap.get(feeder2Id) ?? null;

        let chosenFeederId: string | null = null;
        if (pickedTeamId === feeder1Pick) chosenFeederId = feeder1Id;
        if (pickedTeamId === feeder2Pick) chosenFeederId = feeder2Id;
        if (!chosenFeederId) {
          aliveForPick.set(game.id, false);
          continue;
        }

        aliveForPick.set(game.id, aliveForPick.get(chosenFeederId) ?? false);
      }
    }

    for (const game of games) {
      const round = game.round;
      const roundScore = perRound[round];
      const pickedTeamId = pickMap.get(game.id) ?? null;

      const basePts = getRoundPointsFor(pool, round);

      // Points this pick would be worth if it ended up being correct (used for possible/missing display).
      let upsetBonusIfCorrect = 0;
      if (pickedTeamId && pool.upset_points_enabled) {
        const { isUpset: upset, seedDifferential } = isUpset(
          pickedTeamId,
          game,
          teamSeedsById
        );
        if (upset && seedDifferential > 0) {
          const mult = getUpsetMultiplierFor(pool, round);
          upsetBonusIfCorrect = mult * seedDifferential;
        }
      }
      const pointsIfCorrect = basePts + upsetBonusIfCorrect;

      // Actual points (based on real winners so far)
      if (game.winner_id != null) {
        roundScore.gamesPlayed += 1;

        if (pickedTeamId === game.winner_id) {
          roundScore.gamesCorrect += 1;

          roundScore.basePoints += basePts;
          roundScore.upsetPoints += upsetBonusIfCorrect;
          roundScore.totalPoints += pointsIfCorrect;
          possiblePerRound[round] += pointsIfCorrect;

          roundScore.evaluatedGames.push({
            gameId: game.id,
            pickedTeamId,
            status: "correct",
            pointsAwarded: pointsIfCorrect,
            pointsIfCorrect,
          });
        } else {
          roundScore.evaluatedGames.push({
            gameId: game.id,
            pickedTeamId,
            status: "wrong",
            pointsAwarded: 0,
            pointsIfCorrect,
          });
        }
      }

      // Unplayed (winner not known yet): if the user's pick is already dead due to earlier wrong picks,
      // we still count it in `gamesPlayed` as a "missing/wrong" slot.
      if (game.winner_id == null) {
        const alive = aliveForPick.get(game.id) === true;
        if (!alive) {
          // Only count evaluated slots when the pick is already impossible.
          roundScore.gamesPlayed += 1;
          roundScore.evaluatedGames.push({
            gameId: game.id,
            pickedTeamId,
            status: "dead",
            pointsAwarded: 0,
            pointsIfCorrect,
          });
        } else {
          // Possible points: if they get everything right from here, they'd score pointsIfCorrect.
          possiblePerRound[round] += pointsIfCorrect;
        }
      }
    }

    let totalBracketPoints = 0;
    for (let r = 1; r <= 6; r++) {
      totalBracketPoints += perRound[r].totalPoints;
    }

    const totalGoodyPoints = 0;
    const totalPoints = totalBracketPoints + totalGoodyPoints;

    const possiblePoints = Object.values(possiblePerRound).reduce((a, b) => a + b, 0) + totalGoodyPoints;

    summaries.push({
      bracketId: bracket.id,
      userId: bracket.user_id,
      perRound,
      totalBracketPoints,
      totalGoodyPoints,
      totalPoints,
      possiblePoints,
    });
  }

  return summaries;
}

