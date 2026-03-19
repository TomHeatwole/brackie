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
import type { PoolGoodyWithType } from "./pools";
import type { GoodyResultRow } from "./goodies";

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

export type GoodyStatus = "won" | "stroke" | "eliminated" | "alive" | "not_awarded" | "pending";

export interface GoodyScoreEntry {
  pointsAwarded: number;
  status: GoodyStatus;
  bestCorrectSeed?: number | null;
  bestCorrectTeamId?: string | null;
  bestAliveSeed?: number | null;
  bestAliveTeamId?: string | null;
  isStroke?: boolean;
  /** Human-readable description of alive scenarios, e.g. "(15) Oakland, (14) Morehead St." */
  aliveInfo?: string;
  /** Best region bracket: the user's best region name */
  bestRegion?: string | null;
  /** Best region bracket: correct picks in best region */
  bestRegionCorrect?: number;
  /** Best region bracket: total played games in best region */
  bestRegionPlayed?: number;
}

export interface BracketScoreSummary {
  bracketId: string;
  userId: string;
  perRound: Record<number, PerRoundScore>;
  totalBracketPoints: number;
  totalGoodyPoints: number;
  totalPoints: number;
  possiblePoints: number;
  possibleBracketPoints: number;
  possibleGoodyPoints: number;
  perGoody?: Record<string, GoodyScoreEntry>;
}

export interface PoolScoringContext {
  pool: PoolWithDetails;
  games: TournamentGame[];
  teams: Team[];
  brackets: BracketWithPicks[];
  finalFourMatchups: [string, string][];
  poolGoodies: PoolGoodyWithType[];
}

export async function buildPoolScoringContext(
  supabase: SupabaseClient,
  pool: PoolWithDetails,
  options: { testMode: boolean; poolGoodies?: PoolGoodyWithType[] }
): Promise<PoolScoringContext> {
  const { testMode } = options;

  const tournament = await getTournament(supabase, pool.tournament_id, testMode);
  if (!tournament) {
    return { pool, games: [], teams: [], brackets: [], finalFourMatchups: [], poolGoodies: options.poolGoodies ?? [] };
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
    return { pool, games, teams, brackets: [], finalFourMatchups: getBracketStructure(tournament).finalFourMatchups, poolGoodies: options.poolGoodies ?? [] };
  }

  const { data: bracketsRows } = await supabase
    .from("brackets")
    .select("*")
    .in("id", bracketIds);

  if (!bracketsRows || bracketsRows.length === 0) {
    return { pool, games, teams, brackets: [], finalFourMatchups: getBracketStructure(tournament).finalFourMatchups, poolGoodies: options.poolGoodies ?? [] };
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
    poolGoodies: options.poolGoodies ?? [],
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

export const LOWEST_SEED_GOODY_ROUNDS: Record<string, number> = {
  lowest_seed_first_round: 1,
  lowest_seed_sweet_16: 2,
  lowest_seed_elite_eight: 3,
  lowest_seed_final_four: 4,
};

/**
 * Derive a user's implicit "answer" for a lowest-seed goody from their bracket picks.
 * Returns the highest-seeded team they picked to win in the target round.
 */
export function getBracketDerivedGoodyAnswer(
  picks: { game_id: string; picked_team_id: string }[],
  games: TournamentGame[],
  teams: Team[],
  goodyKey: string,
): { teamId: string; teamName: string; seed: number } | null {
  const targetRound = LOWEST_SEED_GOODY_ROUNDS[goodyKey];
  if (targetRound == null) return null;

  const teamsById = new Map<string, Team>();
  for (const t of teams) teamsById.set(t.id, t);

  const pickMap = new Map<string, string>();
  for (const p of picks) pickMap.set(p.game_id, p.picked_team_id);

  let bestSeed = 0;
  let bestTeam: Team | null = null;

  for (const game of games) {
    if (game.round !== targetRound) continue;
    const pickedTeamId = pickMap.get(game.id);
    if (!pickedTeamId) continue;
    const team = teamsById.get(pickedTeamId);
    if (!team) continue;
    if (team.seed > bestSeed) {
      bestSeed = team.seed;
      bestTeam = team;
    }
  }

  if (!bestTeam) return null;
  return { teamId: bestTeam.id, teamName: bestTeam.name, seed: bestTeam.seed };
}

interface BracketAliveData {
  bracketId: string;
  userId: string;
  pickMap: Map<string, string>;
  aliveForPick: Map<string, boolean>;
}

/**
 * For a single lowest-seed goody, compute per-user status across all brackets.
 *
 * Algorithm (round complete):
 *   1. Collect every distinct seed that actually won a game, sorted descending
 *      (highest seed# = "lowest seed" first).
 *   2. Walk down that list. At each seed level, check whether ANY user correctly
 *      picked a winner at that seed.
 *   3. The first seed level with correct pickers determines the result:
 *      - If it's the actual lowest seed (first checked): full points.
 *      - If we had to walk past the actual lowest: stroke rule – split & ceil.
 *   4. Somebody always wins unless no user correctly predicted any game in the
 *      round (extremely unlikely).
 *
 * Must be called after all brackets have their aliveForPick computed.
 */
function scoreOneLowestSeedGoody(
  targetRound: number,
  goodyPoints: number,
  gamesByRound: Map<number, TournamentGame[]>,
  teamSeedsById: Map<string, number>,
  teamsById: Map<string, Team>,
  allBracketData: BracketAliveData[],
): Map<string, GoodyScoreEntry> {
  const roundGames = gamesByRound.get(targetRound) ?? [];
  const playedGames = roundGames.filter((g) => g.winner_id != null);
  const unplayedGames = roundGames.filter((g) => g.winner_id == null);
  const roundComplete = unplayedGames.length === 0 && roundGames.length > 0;
  const roundStarted = playedGames.length > 0;

  // Distinct winning seed values, sorted descending (lowest seed first)
  const winningSeedsDesc: number[] = [];
  {
    const seen = new Set<number>();
    for (const g of playedGames) {
      const seed = teamSeedsById.get(g.winner_id!) ?? 0;
      if (seed > 0 && !seen.has(seed)) {
        seen.add(seed);
        winningSeedsDesc.push(seed);
      }
    }
    winningSeedsDesc.sort((a, b) => b - a);
  }

  const sWon = winningSeedsDesc[0] ?? 0;

  const result = new Map<string, GoodyScoreEntry>();

  // --- Per-user analysis ---
  // For each user, collect correct picks by seed and alive picks.

  interface UserAnalysis {
    /** Map from seed number to the teamId(s) the user correctly picked at that seed */
    correctBySeed: Map<number, string>;
    bestCorrectSeed: number;
    bestCorrectTeamId: string | null;
    bestAliveSeed: number;
    bestAliveTeamId: string | null;
    alivePicks: { teamId: string; seed: number }[];
  }

  const analyses = new Map<string, UserAnalysis>();

  for (const bd of allBracketData) {
    const correctBySeed = new Map<number, string>();
    let bestCorrectSeed = 0;
    let bestCorrectTeamId: string | null = null;
    let bestAliveSeed = 0;
    let bestAliveTeamId: string | null = null;
    const alivePicks: { teamId: string; seed: number }[] = [];

    for (const game of roundGames) {
      const pickedTeamId = bd.pickMap.get(game.id);
      if (!pickedTeamId) continue;
      const pickedSeed = teamSeedsById.get(pickedTeamId) ?? 0;

      if (game.winner_id != null) {
        if (pickedTeamId === game.winner_id) {
          if (!correctBySeed.has(pickedSeed) || pickedSeed > bestCorrectSeed) {
            correctBySeed.set(pickedSeed, pickedTeamId);
          }
          if (pickedSeed > bestCorrectSeed) {
            bestCorrectSeed = pickedSeed;
            bestCorrectTeamId = pickedTeamId;
          }
        }
      } else {
        const alive = bd.aliveForPick.get(game.id) === true;
        if (alive) {
          alivePicks.push({ teamId: pickedTeamId, seed: pickedSeed });
          if (pickedSeed > bestAliveSeed) {
            bestAliveSeed = pickedSeed;
            bestAliveTeamId = pickedTeamId;
          }
        }
      }
    }

    analyses.set(bd.userId, {
      correctBySeed,
      bestCorrectSeed,
      bestCorrectTeamId,
      bestAliveSeed,
      bestAliveTeamId,
      alivePicks,
    });
  }

  // --- Round not started: everyone is pending/alive ---
  if (!roundStarted && !roundComplete) {
    for (const bd of allBracketData) {
      const a = analyses.get(bd.userId)!;
      const hasAnyPick = a.alivePicks.length > 0;
      result.set(bd.userId, {
        pointsAwarded: 0,
        status: hasAnyPick ? "alive" : "pending",
        bestAliveSeed: a.bestAliveSeed > 0 ? a.bestAliveSeed : null,
        bestAliveTeamId: a.bestAliveTeamId,
      });
    }
    return result;
  }

  // --- Round complete: walk down actual winning seeds ---
  if (roundComplete) {
    let awardSeed = 0;
    let awardUserIds: string[] = [];
    let isStroke = false;

    for (let i = 0; i < winningSeedsDesc.length; i++) {
      const seed = winningSeedsDesc[i];
      const usersAtSeed: string[] = [];
      for (const bd of allBracketData) {
        const a = analyses.get(bd.userId)!;
        if (a.correctBySeed.has(seed)) {
          usersAtSeed.push(bd.userId);
        }
      }
      if (usersAtSeed.length > 0) {
        awardSeed = seed;
        awardUserIds = usersAtSeed;
        isStroke = i > 0;
        break;
      }
    }

    if (awardUserIds.length > 0) {
      const pts = isStroke
        ? Math.ceil(goodyPoints / awardUserIds.length)
        : goodyPoints;
      const awardSet = new Set(awardUserIds);

      for (const bd of allBracketData) {
        const a = analyses.get(bd.userId)!;
        const won = awardSet.has(bd.userId);
        result.set(bd.userId, {
          pointsAwarded: won ? pts : 0,
          status: won ? (isStroke ? "stroke" : "won") : "not_awarded",
          bestCorrectSeed: a.bestCorrectSeed > 0 ? a.bestCorrectSeed : null,
          bestCorrectTeamId: a.bestCorrectTeamId,
          isStroke: won && isStroke ? true : undefined,
        });
      }
    } else {
      for (const bd of allBracketData) {
        result.set(bd.userId, {
          pointsAwarded: 0,
          status: "not_awarded",
          bestCorrectSeed: null,
          bestCorrectTeamId: null,
        });
      }
    }

    return result;
  }

  // --- Round in progress ---
  // A user is "alive" if they have a correct pick at seed >= sWon OR any
  // alive pick that could still produce a winning seed.
  for (const bd of allBracketData) {
    const a = analyses.get(bd.userId)!;
    const hasAliveAbove = a.alivePicks.some((p) => p.seed >= sWon);
    const hasCorrectAtOrAbove = a.bestCorrectSeed >= sWon && a.bestCorrectSeed > 0;
    const isAlive = hasAliveAbove || hasCorrectAtOrAbove || a.alivePicks.length > 0;

    if (isAlive) {
      const aliveInfoParts: string[] = [];
      if (hasCorrectAtOrAbove && a.bestCorrectTeamId) {
        const t = teamsById.get(a.bestCorrectTeamId);
        if (t) aliveInfoParts.push(`(${t.seed}) ${t.name} ✓`);
      }
      for (const ap of a.alivePicks) {
        const t = teamsById.get(ap.teamId);
        if (t) aliveInfoParts.push(`(${t.seed}) ${t.name}`);
      }

      result.set(bd.userId, {
        pointsAwarded: 0,
        status: "alive",
        bestCorrectSeed: a.bestCorrectSeed > 0 ? a.bestCorrectSeed : null,
        bestCorrectTeamId: a.bestCorrectTeamId,
        bestAliveSeed: a.bestAliveSeed > 0 ? a.bestAliveSeed : null,
        bestAliveTeamId: a.bestAliveTeamId,
        aliveInfo: aliveInfoParts.length > 0 ? aliveInfoParts.join(", ") : undefined,
      });
    } else {
      result.set(bd.userId, {
        pointsAwarded: 0,
        status: "eliminated",
        bestCorrectSeed: a.bestCorrectSeed > 0 ? a.bestCorrectSeed : null,
        bestCorrectTeamId: a.bestCorrectTeamId,
        bestAliveSeed: null,
        bestAliveTeamId: null,
      });
    }
  }

  return result;
}

/**
 * Score the best_region_bracket goody for all users.
 *
 * Each region has 15 games (rounds 1-4). For each user, find which region they
 * got the most correct picks in. The goody is only "won" once all four regions
 * are complete (i.e. we've reached the Final Four). Until then, show each user's
 * current best region and their correct/played count as "alive".
 */
function scoreBestRegionBracket(
  points: number,
  games: TournamentGame[],
  allBracketData: BracketAliveData[],
): Map<string, GoodyScoreEntry> {
  const regionGames = games.filter((g) => g.region != null && g.round >= 1 && g.round <= 4);

  const gamesByRegion = new Map<string, TournamentGame[]>();
  for (const g of regionGames) {
    const list = gamesByRegion.get(g.region!) ?? [];
    list.push(g);
    gamesByRegion.set(g.region!, list);
  }

  const regions = [...gamesByRegion.keys()];

  const regionPlayed = new Map<string, number>();
  const regionTotal = new Map<string, number>();
  let allRegionsComplete = true;
  for (const region of regions) {
    const rGames = gamesByRegion.get(region) ?? [];
    regionTotal.set(region, rGames.length);
    const played = rGames.filter((g) => g.winner_id != null).length;
    regionPlayed.set(region, played);
    if (played < rGames.length) allRegionsComplete = false;
  }

  const result = new Map<string, GoodyScoreEntry>();

  for (const bd of allBracketData) {
    let bestRegion: string | null = null;
    let bestCorrect = -1;
    let bestPlayed = 0;

    for (const region of regions) {
      const rGames = gamesByRegion.get(region) ?? [];
      let correct = 0;
      for (const game of rGames) {
        if (game.winner_id == null) continue;
        const picked = bd.pickMap.get(game.id);
        if (picked === game.winner_id) correct++;
      }
      if (correct > bestCorrect || (correct === bestCorrect && (regionPlayed.get(region) ?? 0) > bestPlayed)) {
        bestCorrect = correct;
        bestRegion = region;
        bestPlayed = regionPlayed.get(region) ?? 0;
      }
    }

    if (!bestRegion) {
      result.set(bd.userId, { pointsAwarded: 0, status: "pending" });
      continue;
    }

    result.set(bd.userId, {
      pointsAwarded: 0,
      status: allRegionsComplete ? "pending" : "alive",
      bestRegion,
      bestRegionCorrect: bestCorrect,
      bestRegionPlayed: bestPlayed,
    });
  }

  if (!allRegionsComplete) return result;

  // All regions done — find the winner(s): whoever has the highest bestRegionCorrect
  let maxCorrect = 0;
  for (const entry of result.values()) {
    if ((entry.bestRegionCorrect ?? 0) > maxCorrect) {
      maxCorrect = entry.bestRegionCorrect!;
    }
  }

  for (const [, entry] of result) {
    if ((entry.bestRegionCorrect ?? 0) === maxCorrect) {
      entry.status = "won";
      entry.pointsAwarded = points;
    } else {
      entry.status = "not_awarded";
    }
  }

  return result;
}

export function scoreBracketsForPool(ctx: PoolScoringContext): BracketScoreSummary[] {
  const { pool, games, teams, brackets, poolGoodies } = ctx;
  if (games.length === 0 || teams.length === 0 || brackets.length === 0) {
    return [];
  }

  const teamSeedsById = buildTeamSeedMap(teams);
  const teamsById = new Map<string, Team>();
  for (const t of teams) teamsById.set(t.id, t);
  const gameIndex = buildGameIndex(games);

  const gamesByRound = new Map<number, TournamentGame[]>();
  for (const g of games) {
    const list = gamesByRound.get(g.round) ?? [];
    list.push(g);
    gamesByRound.set(g.round, list);
  }

  const allBracketData: BracketAliveData[] = [];
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

    const aliveForPick = new Map<string, boolean>();

    for (let r = 1; r <= 6; r++) {
      const roundGames = gamesByRound.get(r) ?? [];
      for (const game of roundGames) {
        const pickedTeamId = pickMap.get(game.id);
        if (!pickedTeamId) {
          aliveForPick.set(game.id, false);
          continue;
        }

        if (game.round === 1) {
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

        let alive = aliveForPick.get(chosenFeederId) ?? false;
        if (alive && game.winner_id != null && pickedTeamId !== game.winner_id) {
          alive = false;
        }
        aliveForPick.set(game.id, alive);
      }
    }

    allBracketData.push({
      bracketId: bracket.id,
      userId: bracket.user_id,
      pickMap,
      aliveForPick,
    });

    for (const game of games) {
      const round = game.round;
      const roundScore = perRound[round];
      const pickedTeamId = pickMap.get(game.id) ?? null;

      const basePts = getRoundPointsFor(pool, round);

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

      if (game.winner_id == null) {
        const alive = aliveForPick.get(game.id) === true;
        if (!alive) {
          roundScore.gamesPlayed += 1;
          roundScore.evaluatedGames.push({
            gameId: game.id,
            pickedTeamId,
            status: "dead",
            pointsAwarded: 0,
            pointsIfCorrect,
          });
        } else {
          possiblePerRound[round] += pointsIfCorrect;
        }
      }
    }

    let totalBracketPoints = 0;
    for (let r = 1; r <= 6; r++) {
      totalBracketPoints += perRound[r].totalPoints;
    }

    const possibleBracketPoints = Object.values(possiblePerRound).reduce((a, b) => a + b, 0);

    summaries.push({
      bracketId: bracket.id,
      userId: bracket.user_id,
      perRound,
      totalBracketPoints,
      totalGoodyPoints: 0,
      totalPoints: totalBracketPoints,
      possiblePoints: possibleBracketPoints,
      possibleBracketPoints,
      possibleGoodyPoints: 0,
      perGoody: {},
    });
  }

  // --- Goody scoring (cross-bracket) ---
  const lowestSeedGoodies = (poolGoodies ?? []).filter(
    (pg) => pg.goody_types?.key && pg.goody_types.key in LOWEST_SEED_GOODY_ROUNDS
  );

  if (lowestSeedGoodies.length > 0) {
    for (const pg of lowestSeedGoodies) {
      const goodyKey = pg.goody_types!.key;
      const targetRound = LOWEST_SEED_GOODY_ROUNDS[goodyKey];
      const goodyTypeId = pg.goody_type_id;

      const perUserScores = scoreOneLowestSeedGoody(
        targetRound,
        pg.points,
        gamesByRound,
        teamSeedsById,
        teamsById,
        allBracketData,
      );

      for (const summary of summaries) {
        const entry = perUserScores.get(summary.userId);
        if (entry) {
          summary.perGoody![goodyTypeId] = entry;
          summary.totalGoodyPoints += entry.pointsAwarded;

          if (entry.status === "alive" || entry.status === "pending") {
            summary.possibleGoodyPoints += pg.points;
          }
        }
      }
    }

  }

  // --- Best Region Bracket goody ---
  const bestRegionGoody = (poolGoodies ?? []).find(
    (pg) => pg.goody_types?.key === "best_region_bracket"
  );
  if (bestRegionGoody) {
    const perUserScores = scoreBestRegionBracket(
      bestRegionGoody.points,
      games,
      allBracketData,
    );
    for (const summary of summaries) {
      const entry = perUserScores.get(summary.userId);
      if (entry) {
        summary.perGoody![bestRegionGoody.goody_type_id] = entry;
        summary.totalGoodyPoints += entry.pointsAwarded;
        if (entry.status === "alive" || entry.status === "pending") {
          summary.possibleGoodyPoints += bestRegionGoody.points;
        }
      }
    }
  }

  // Recompute totals after all bracket-derived goodies
  for (const summary of summaries) {
    summary.totalPoints = summary.totalBracketPoints + summary.totalGoodyPoints;
    summary.possiblePoints = summary.possibleBracketPoints + summary.possibleGoodyPoints;
  }

  return summaries;
}

// ── User-input goody scoring ──

/**
 * Score the Dark Horse National Champion goody using tournament game data
 * rather than admin-set goody_results.
 *
 * Rules:
 * 1. If the team is a 1 or 2 seed AND anyone in the pool picked it as their
 *    bracket champion → auto-incorrect.
 * 2. If the team has been eliminated from the tournament → auto-incorrect.
 * 3. If the team won the championship → stroke rule is always in effect;
 *    all users who picked it split the points.
 * 4. Points: fixed (pg.points) or bracket_upset_points mode (championship
 *    base + upset bonus).
 */
function scoreDarkHorseChampion(
  pg: PoolGoodyWithType,
  answersForGoody: { userId: string; goodyTypeId: string; value: Record<string, unknown> | null }[],
  ctx: PoolScoringContext,
  ensureUserMap: (userId: string) => Map<string, GoodyScoreEntry>,
): void {
  const goodyTypeId = pg.goody_type_id;
  const { pool, games, teams, brackets } = ctx;
  const teamSeedsById = buildTeamSeedMap(teams);

  const eliminatedTeams = new Set<string>();
  for (const g of games) {
    if (g.winner_id != null) {
      if (g.team1_id && g.team1_id !== g.winner_id) eliminatedTeams.add(g.team1_id);
      if (g.team2_id && g.team2_id !== g.winner_id) eliminatedTeams.add(g.team2_id);
    }
  }

  const champGame = games.find((g) => g.round === 6);
  const champWinnerId = champGame?.winner_id ?? null;

  const bracketChampionTeams = new Set<string>();
  if (champGame) {
    for (const b of brackets) {
      for (const pick of b.picks) {
        if (pick.game_id === champGame.id) {
          bracketChampionTeams.add(pick.picked_team_id);
        }
      }
    }
  }

  let points: number;
  if (pg.scoring_mode === "bracket_upset_points") {
    const base = getRoundPointsFor(pool, 6);
    let upsetBonus = 0;
    if (champWinnerId && champGame && pool.upset_points_enabled) {
      const res = isUpset(champWinnerId, champGame, teamSeedsById);
      if (res.isUpset && res.seedDifferential > 0) {
        upsetBonus = getUpsetMultiplierFor(pool, 6) * res.seedDifferential;
      }
    }
    points = base + upsetBonus;
  } else {
    points = pg.points;
  }

  const winnerUserIds: string[] = [];

  for (const answer of answersForGoody) {
    const teamId = extractUserInputAnswer("dark_horse_champion", answer.value);
    if (!teamId) {
      ensureUserMap(answer.userId).set(goodyTypeId, { pointsAwarded: 0, status: "pending" });
      continue;
    }

    const seed = teamSeedsById.get(teamId);

    if (seed != null && seed <= 2 && bracketChampionTeams.has(teamId)) {
      ensureUserMap(answer.userId).set(goodyTypeId, { pointsAwarded: 0, status: "eliminated" });
      continue;
    }

    if (eliminatedTeams.has(teamId)) {
      ensureUserMap(answer.userId).set(goodyTypeId, { pointsAwarded: 0, status: "eliminated" });
      continue;
    }

    if (champWinnerId && teamId === champWinnerId) {
      winnerUserIds.push(answer.userId);
      continue;
    }

    if (!champWinnerId) {
      ensureUserMap(answer.userId).set(goodyTypeId, { pointsAwarded: 0, status: "alive" });
    } else {
      ensureUserMap(answer.userId).set(goodyTypeId, { pointsAwarded: 0, status: "eliminated" });
    }
  }

  if (winnerUserIds.length > 0) {
    const isStrokeApplied = winnerUserIds.length > 1;
    const pts = isStrokeApplied ? Math.ceil(points / winnerUserIds.length) : points;
    for (const uid of winnerUserIds) {
      ensureUserMap(uid).set(goodyTypeId, {
        pointsAwarded: pts,
        status: isStrokeApplied ? "stroke" : "won",
        isStroke: isStrokeApplied || undefined,
      });
    }
  }
}

export function extractUserInputAnswer(
  goodyKey: string,
  answerValue: Record<string, unknown> | null
): string | null {
  if (!answerValue) return null;
  if (goodyKey === "nit_champion" && answerValue.nit_matchup)
    return String(answerValue.nit_matchup);
  if (goodyKey === "first_conference_out" && answerValue.conference_key)
    return String(answerValue.conference_key);
  if (goodyKey === "dark_horse_champion" && answerValue.team_id)
    return String(answerValue.team_id);
  if (goodyKey === "biggest_first_round_blowout" && answerValue.game_id)
    return String(answerValue.game_id);
  return null;
}

interface TieredResult {
  winner: string[];
  loserTiers: string[][];
}

function parseTieredResult(value: Record<string, unknown>): TieredResult {
  let winner: string[];
  if (Array.isArray(value.winner)) {
    winner = (value.winner as unknown[]).map(String);
  } else if (typeof value.winner === "string") {
    winner = [value.winner];
  } else {
    winner = [];
  }
  return {
    winner,
    loserTiers: Array.isArray(value.loser_tiers)
      ? (value.loser_tiers as unknown[]).map((t) =>
          Array.isArray(t) ? (t as unknown[]).map(String) : []
        )
      : [],
  };
}

/**
 * Score user-input goodies (NIT champion, first conference out, etc.)
 * by comparing each user's answer to the admin-set goody_results.
 *
 * Returns Map<userId, Map<goodyTypeId, GoodyScoreEntry>>.
 */
export function scoreUserInputGoodies(
  poolGoodies: PoolGoodyWithType[],
  goodyResults: GoodyResultRow[],
  allGoodyAnswers: { userId: string; goodyTypeId: string; value: Record<string, unknown> | null }[],
  scoringCtx?: PoolScoringContext,
): Map<string, Map<string, GoodyScoreEntry>> {
  const resultsByGoodyType = new Map<string, GoodyResultRow>();
  for (const r of goodyResults) {
    resultsByGoodyType.set(r.goody_type_id, r);
  }

  const userInputGoodies = poolGoodies.filter(
    (pg) => pg.goody_types?.input_type === "user_input"
  );

  const allScores = new Map<string, Map<string, GoodyScoreEntry>>();

  function ensureUserMap(userId: string): Map<string, GoodyScoreEntry> {
    let m = allScores.get(userId);
    if (!m) { m = new Map(); allScores.set(userId, m); }
    return m;
  }

  for (const pg of userInputGoodies) {
    const goodyKey = pg.goody_types?.key ?? "";
    const goodyTypeId = pg.goody_type_id;
    const points = pg.points;
    const strokeEnabled = pg.stroke_rule_enabled;

    const result = resultsByGoodyType.get(goodyTypeId);
    const tiered = result ? parseTieredResult(result.value) : null;
    const answersForGoody = allGoodyAnswers.filter((a) => a.goodyTypeId === goodyTypeId);

    if (goodyKey === "dark_horse_champion" && scoringCtx) {
      scoreDarkHorseChampion(pg, answersForGoody, scoringCtx, ensureUserMap);
      continue;
    }

    if (!tiered || tiered.winner.length === 0) {
      for (const answer of answersForGoody) {
        ensureUserMap(answer.userId).set(goodyTypeId, {
          pointsAwarded: 0,
          status: "pending",
        });
      }
      continue;
    }

    const winnerSet = new Set(tiered.winner);
    const winnerUsers: string[] = [];
    const tierUsers = new Map<number, string[]>();
    const otherUsers: string[] = [];

    for (const answer of answersForGoody) {
      const userPick = extractUserInputAnswer(goodyKey, answer.value);
      if (!userPick) {
        otherUsers.push(answer.userId);
        continue;
      }

      if (winnerSet.has(userPick)) {
        winnerUsers.push(answer.userId);
      } else if (strokeEnabled) {
        let foundTier = -1;
        for (let i = 0; i < tiered.loserTiers.length; i++) {
          if (tiered.loserTiers[i].includes(userPick)) {
            foundTier = i;
            break;
          }
        }
        if (foundTier >= 0) {
          const list = tierUsers.get(foundTier) ?? [];
          list.push(answer.userId);
          tierUsers.set(foundTier, list);
        } else {
          otherUsers.push(answer.userId);
        }
      } else {
        otherUsers.push(answer.userId);
      }
    }

    function setNotAwarded(userIds: string[]) {
      for (const uid of userIds) {
        ensureUserMap(uid).set(goodyTypeId, { pointsAwarded: 0, status: "not_awarded" });
      }
    }

    if (winnerUsers.length > 0) {
      for (const uid of winnerUsers) {
        ensureUserMap(uid).set(goodyTypeId, { pointsAwarded: points, status: "won" });
      }
      for (const [, users] of tierUsers) setNotAwarded(users);
      setNotAwarded(otherUsers);
    } else if (strokeEnabled) {
      // No one picked the winner — walk tiers closest-first for stroke
      let strokeUsers: string[] = [];
      const sortedTierKeys = [...tierUsers.keys()].sort((a, b) => a - b);
      for (const tierIdx of sortedTierKeys) {
        const users = tierUsers.get(tierIdx) ?? [];
        if (users.length > 0) { strokeUsers = users; break; }
      }

      if (strokeUsers.length > 0) {
        const strokePts = Math.ceil(points / strokeUsers.length);
        const strokeSet = new Set(strokeUsers);
        for (const answer of answersForGoody) {
          if (strokeSet.has(answer.userId)) {
            ensureUserMap(answer.userId).set(goodyTypeId, {
              pointsAwarded: strokePts,
              status: "stroke",
              isStroke: true,
            });
          } else {
            ensureUserMap(answer.userId).set(goodyTypeId, {
              pointsAwarded: 0,
              status: "not_awarded",
            });
          }
        }
      } else {
        for (const a of answersForGoody) setNotAwarded([a.userId]);
      }
    } else {
      for (const a of answersForGoody) setNotAwarded([a.userId]);
    }
  }

  return allScores;
}
