import { describe, it, expect } from "vitest";
import type { TournamentGame, Team, PoolWithDetails, BracketWithPicks } from "./types";
import {
  DEFAULT_ROUND_POINTS,
  DEFAULT_UPSET_MULTIPLIERS,
  SEED_MATCHUPS,
} from "./types";
import {
  getRoundPointsFor,
  getUpsetMultiplierFor,
  computeChalkSeedForGame,
  isUpset,
  buildGameIndex,
  getFeederIdsForGame,
  buildTeamSeedMap,
  scoreBracketsForPool,
  scoreUserInputGoodies,
  extractUserInputAnswer,
  getBracketDerivedGoodyAnswer,
  LOWEST_SEED_GOODY_ROUNDS,
} from "./scoring";
import type { PoolScoringContext } from "./scoring";
import type { PoolGoodyWithType } from "./pools";
import type { GoodyResultRow } from "./goodies";

// ─── Test Fixture Helpers ────────────────────────────────────────────────────

function makePool(overrides: Partial<PoolWithDetails> = {}): PoolWithDetails {
  return {
    id: "pool-1",
    name: "Test Pool",
    creator_id: "creator-1",
    tournament_id: "tourney-1",
    invite_code: "ABCD1234",
    round_points: { ...DEFAULT_ROUND_POINTS },
    upset_points_enabled: true,
    upset_multipliers: { ...DEFAULT_UPSET_MULTIPLIERS },
    goodies_enabled: true,
    image_url: null,
    created_at: "2025-03-01",
    member_count: 2,
    ...overrides,
  };
}

function makeTeam(id: string, seed: number, region: string, name?: string): Team {
  return {
    id,
    tournament_id: "tourney-1",
    name: name ?? `Team-${seed}-${region}`,
    seed,
    region,
  };
}

function makeGame(
  id: string,
  round: number,
  position: number,
  opts: {
    region?: string | null;
    team1_id?: string | null;
    team2_id?: string | null;
    winner_id?: string | null;
  } = {}
): TournamentGame {
  return {
    id,
    tournament_id: "tourney-1",
    round,
    position,
    region: opts.region ?? null,
    team1_id: opts.team1_id ?? null,
    team2_id: opts.team2_id ?? null,
    winner_id: opts.winner_id ?? null,
  };
}

function makeBracket(
  id: string,
  userId: string,
  picks: { game_id: string; picked_team_id: string }[]
): BracketWithPicks {
  return {
    id,
    user_id: userId,
    tournament_id: "tourney-1",
    name: `Bracket ${id}`,
    created_at: "2025-03-01",
    updated_at: "2025-03-01",
    picks: picks.map((p) => ({
      id: `pick-${p.game_id}-${id}`,
      bracket_id: id,
      tournament_id: "tourney-1",
      ...p,
    })),
    pick_count: picks.length,
  };
}

/**
 * Build a minimal single-region set of 8 first-round games matching SEED_MATCHUPS.
 * The top seed (team1) is always named "R{region}-S{seed}".
 */
function buildRegionTeamsAndGames(region: string) {
  const teams: Team[] = [];
  const games: TournamentGame[] = [];

  for (let pos = 0; pos < 8; pos++) {
    const [seedA, seedB] = SEED_MATCHUPS[pos];
    const teamA = makeTeam(`${region}-s${seedA}`, seedA, region, `${region} ${seedA}-seed`);
    const teamB = makeTeam(`${region}-s${seedB}`, seedB, region, `${region} ${seedB}-seed`);
    teams.push(teamA, teamB);
    games.push(
      makeGame(`r1-${region}-${pos}`, 1, pos, {
        region,
        team1_id: teamA.id,
        team2_id: teamB.id,
      })
    );
  }

  // Round 2: 4 games
  for (let pos = 0; pos < 4; pos++) {
    games.push(makeGame(`r2-${region}-${pos}`, 2, pos, { region }));
  }
  // Round 3: 2 games
  for (let pos = 0; pos < 2; pos++) {
    games.push(makeGame(`r3-${region}-${pos}`, 3, pos, { region }));
  }
  // Round 4: 1 game
  games.push(makeGame(`r4-${region}-0`, 4, 0, { region }));

  return { teams, games };
}

/**
 * Build a full 63-game tournament with 4 regions + FF + Championship.
 * All round 1 games have team1/team2 assigned per SEED_MATCHUPS.
 */
function buildFullTournament(regions = ["East", "South", "West", "Midwest"]) {
  let allTeams: Team[] = [];
  let allGames: TournamentGame[] = [];

  for (const region of regions) {
    const { teams, games } = buildRegionTeamsAndGames(region);
    allTeams = allTeams.concat(teams);
    allGames = allGames.concat(games);
  }

  // Final Four: 2 games (round 5)
  allGames.push(makeGame("r5-0", 5, 0));
  allGames.push(makeGame("r5-1", 5, 1));

  // Championship: 1 game (round 6)
  allGames.push(makeGame("r6-0", 6, 0));

  const finalFourMatchups: [string, string][] = [
    [regions[0], regions[1]],
    [regions[2], regions[3]],
  ];

  return { teams: allTeams, games: allGames, finalFourMatchups };
}

// ─── getRoundPointsFor / getUpsetMultiplierFor ───────────────────────────────

describe("getRoundPointsFor", () => {
  it("returns configured points for each round", () => {
    const pool = makePool();
    expect(getRoundPointsFor(pool, 1)).toBe(10);
    expect(getRoundPointsFor(pool, 2)).toBe(20);
    expect(getRoundPointsFor(pool, 3)).toBe(30);
    expect(getRoundPointsFor(pool, 4)).toBe(50);
    expect(getRoundPointsFor(pool, 5)).toBe(80);
    expect(getRoundPointsFor(pool, 6)).toBe(130);
  });

  it("returns 0 for an unconfigured round", () => {
    const pool = makePool();
    expect(getRoundPointsFor(pool, 7)).toBe(0);
  });

  it("returns 0 when round_points is null", () => {
    const pool = makePool({ round_points: null as any });
    expect(getRoundPointsFor(pool, 1)).toBe(0);
  });

  it("respects custom round points", () => {
    const pool = makePool({ round_points: { "1": 5, "5": 100, "6": 200 } });
    expect(getRoundPointsFor(pool, 1)).toBe(5);
    expect(getRoundPointsFor(pool, 5)).toBe(100);
    expect(getRoundPointsFor(pool, 6)).toBe(200);
    expect(getRoundPointsFor(pool, 3)).toBe(0);
  });
});

describe("getUpsetMultiplierFor", () => {
  it("returns default multipliers", () => {
    const pool = makePool();
    expect(getUpsetMultiplierFor(pool, 1)).toBe(1);
    expect(getUpsetMultiplierFor(pool, 2)).toBe(3);
    expect(getUpsetMultiplierFor(pool, 3)).toBe(5);
    expect(getUpsetMultiplierFor(pool, 4)).toBe(10);
    expect(getUpsetMultiplierFor(pool, 5)).toBe(15);
    expect(getUpsetMultiplierFor(pool, 6)).toBe(20);
  });

  it("returns 0 for missing round", () => {
    const pool = makePool();
    expect(getUpsetMultiplierFor(pool, 7)).toBe(0);
  });

  it("returns 0 when upset_multipliers is null", () => {
    const pool = makePool({ upset_multipliers: null as any });
    expect(getUpsetMultiplierFor(pool, 1)).toBe(0);
  });
});

// ─── computeChalkSeedForGame ─────────────────────────────────────────────────

describe("computeChalkSeedForGame", () => {
  const seedMap = new Map<string, number>([
    ["t1", 1],
    ["t16", 16],
    ["t8", 8],
    ["t5", 5],
  ]);

  it("returns the top seed for a round-1 game", () => {
    const game = makeGame("g1", 1, 0, { region: "East", team1_id: "t1", team2_id: "t16" });
    expect(computeChalkSeedForGame(game, seedMap)).toBe(1);
  });

  it("returns null for round-1 game with missing team1_id", () => {
    const game = makeGame("g1", 1, 0, { region: "East" });
    expect(computeChalkSeedForGame(game, seedMap)).toBeNull();
  });

  it("returns correct chalk seed for round-2 game (min of two feeders)", () => {
    // Position 0 in round 2 feeds from round 1 positions 0 and 1
    // SEED_MATCHUPS[0] = [1, 16], SEED_MATCHUPS[1] = [8, 9]
    // Chalk seeds: 1 and 8, min = 1
    const game = makeGame("g2", 2, 0, { region: "East" });
    expect(computeChalkSeedForGame(game, seedMap)).toBe(1);
  });

  it("returns correct chalk seed for round-2 position 1", () => {
    // SEED_MATCHUPS[2] = [5, 12], SEED_MATCHUPS[3] = [4, 13]
    // Chalk: 5 and 4, min = 4
    const game = makeGame("g2", 2, 1, { region: "East" });
    expect(computeChalkSeedForGame(game, seedMap)).toBe(4);
  });

  it("returns correct chalk for round 3 position 0", () => {
    // R2 pos 0 = 1, R2 pos 1 = 4 → min = 1
    const game = makeGame("g3", 3, 0, { region: "East" });
    expect(computeChalkSeedForGame(game, seedMap)).toBe(1);
  });

  it("returns correct chalk for round 3 position 1", () => {
    // R2 pos 2: seeds 6,3 → 3; R2 pos 3: seeds 7,2 → 2 → min = 2
    const game = makeGame("g3", 3, 1, { region: "East" });
    expect(computeChalkSeedForGame(game, seedMap)).toBe(2);
  });

  it("returns correct chalk for round 4 (Elite Eight)", () => {
    // R3 pos 0 = 1, R3 pos 1 = 2 → min = 1
    const game = makeGame("g4", 4, 0, { region: "East" });
    expect(computeChalkSeedForGame(game, seedMap)).toBe(1);
  });

  it("returns 1 for Final Four (round 5)", () => {
    const game = makeGame("g5", 5, 0);
    expect(computeChalkSeedForGame(game, seedMap)).toBe(1);
  });

  it("returns 1 for Final Four (round 5 position 1)", () => {
    const game = makeGame("g5b", 5, 1);
    expect(computeChalkSeedForGame(game, seedMap)).toBe(1);
  });

  it("returns 1 for Championship (round 6)", () => {
    const game = makeGame("g6", 6, 0);
    expect(computeChalkSeedForGame(game, seedMap)).toBe(1);
  });
});

// ─── isUpset ─────────────────────────────────────────────────────────────────

describe("isUpset", () => {
  const seedMap = new Map<string, number>([
    ["t1", 1],
    ["t2", 2],
    ["t8", 8],
    ["t16", 16],
  ]);

  it("detects a 16-over-1 upset in round 1", () => {
    const game = makeGame("g", 1, 0, { region: "East", team1_id: "t1", team2_id: "t16" });
    const result = isUpset("t16", game, seedMap);
    expect(result.isUpset).toBe(true);
    expect(result.seedDifferential).toBe(15); // 16 - 1
  });

  it("is not an upset when the chalk seed wins round 1", () => {
    const game = makeGame("g", 1, 0, { region: "East", team1_id: "t1", team2_id: "t16" });
    const result = isUpset("t1", game, seedMap);
    expect(result.isUpset).toBe(false);
    expect(result.seedDifferential).toBe(0);
  });

  it("detects a 2-over-1 upset in Final Four", () => {
    const game = makeGame("g", 5, 0);
    const result = isUpset("t2", game, seedMap);
    expect(result.isUpset).toBe(true);
    expect(result.seedDifferential).toBe(1); // 2 - 1
  });

  it("detects an 8-over-1 upset in Championship", () => {
    const game = makeGame("g", 6, 0);
    const result = isUpset("t8", game, seedMap);
    expect(result.isUpset).toBe(true);
    expect(result.seedDifferential).toBe(7); // 8 - 1
  });

  it("is not an upset when a 1-seed wins the Championship", () => {
    const game = makeGame("g", 6, 0);
    const result = isUpset("t1", game, seedMap);
    expect(result.isUpset).toBe(false);
  });

  it("returns no upset for unknown team", () => {
    const game = makeGame("g", 1, 0, { region: "East", team1_id: "t1", team2_id: "t16" });
    const result = isUpset("unknown", game, seedMap);
    expect(result.isUpset).toBe(false);
    expect(result.seedDifferential).toBe(0);
  });
});

// ─── buildGameIndex / getFeederIdsForGame ────────────────────────────────────

describe("getFeederIdsForGame", () => {
  const { games, finalFourMatchups } = buildFullTournament();
  const index = buildGameIndex(games);
  const ctx = { games, finalFourMatchups };

  it("returns null for round 1 games (no feeders)", () => {
    const r1Game = games.find((g) => g.round === 1)!;
    expect(getFeederIdsForGame(r1Game, ctx, index)).toBeNull();
  });

  it("returns correct feeders for a round-2 East game at position 0", () => {
    const r2Game = games.find((g) => g.round === 2 && g.region === "East" && g.position === 0)!;
    const feeders = getFeederIdsForGame(r2Game, ctx, index);
    expect(feeders).toEqual(["r1-East-0", "r1-East-1"]);
  });

  it("returns correct feeders for a round-3 game at position 1", () => {
    const r3Game = games.find((g) => g.round === 3 && g.region === "East" && g.position === 1)!;
    const feeders = getFeederIdsForGame(r3Game, ctx, index);
    expect(feeders).toEqual(["r2-East-2", "r2-East-3"]);
  });

  it("returns correct feeders for a round-4 (Elite Eight) game", () => {
    const r4Game = games.find((g) => g.round === 4 && g.region === "East")!;
    const feeders = getFeederIdsForGame(r4Game, ctx, index);
    expect(feeders).toEqual(["r3-East-0", "r3-East-1"]);
  });

  it("returns correct feeders for Final Four game 0 (East vs South)", () => {
    const ffGame = games.find((g) => g.round === 5 && g.position === 0)!;
    const feeders = getFeederIdsForGame(ffGame, ctx, index);
    expect(feeders).toEqual(["r4-East-0", "r4-South-0"]);
  });

  it("returns correct feeders for Final Four game 1 (West vs Midwest)", () => {
    const ffGame = games.find((g) => g.round === 5 && g.position === 1)!;
    const feeders = getFeederIdsForGame(ffGame, ctx, index);
    expect(feeders).toEqual(["r4-West-0", "r4-Midwest-0"]);
  });

  it("returns correct feeders for Championship game", () => {
    const champGame = games.find((g) => g.round === 6)!;
    const feeders = getFeederIdsForGame(champGame, ctx, index);
    expect(feeders).toEqual(["r5-0", "r5-1"]);
  });
});

// ─── scoreBracketsForPool — integration-level tests ──────────────────────────

describe("scoreBracketsForPool", () => {
  it("returns empty array when no brackets", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();
    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [],
      finalFourMatchups,
      poolGoodies: [],
    };
    expect(scoreBracketsForPool(ctx)).toEqual([]);
  });

  it("awards base points for a correct round-1 pick (no upset)", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Make 1-seed win in East game 0
    const g = games.find((g) => g.id === "r1-East-0")!;
    g.winner_id = "East-s1";

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s1" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    expect(summary.perRound[1].gamesCorrect).toBe(1);
    expect(summary.perRound[1].basePoints).toBe(10);
    expect(summary.perRound[1].upsetPoints).toBe(0);
    expect(summary.perRound[1].totalPoints).toBe(10);
    expect(summary.totalBracketPoints).toBe(10);
  });

  it("awards upset bonus for a round-1 upset pick (16 over 1)", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    const g = games.find((g) => g.id === "r1-East-0")!;
    g.winner_id = "East-s16"; // 16-seed wins!

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s16" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    // base=10, upset=1*15=15 (multiplier=1, diff=16-1=15)
    expect(summary.perRound[1].basePoints).toBe(10);
    expect(summary.perRound[1].upsetPoints).toBe(15);
    expect(summary.perRound[1].totalPoints).toBe(25);
  });

  it("awards no upset bonus when upset_points_enabled is false", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool({ upset_points_enabled: false });

    const g = games.find((g) => g.id === "r1-East-0")!;
    g.winner_id = "East-s16";

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s16" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    expect(summary.perRound[1].basePoints).toBe(10);
    expect(summary.perRound[1].upsetPoints).toBe(0);
    expect(summary.perRound[1].totalPoints).toBe(10);
  });

  it("awards 0 points for an incorrect pick", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    const g = games.find((g) => g.id === "r1-East-0")!;
    g.winner_id = "East-s1";

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s16" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    expect(summary.perRound[1].gamesCorrect).toBe(0);
    expect(summary.perRound[1].totalPoints).toBe(0);
    const eval0 = summary.perRound[1].evaluatedGames.find((e) => e.gameId === "r1-East-0")!;
    expect(eval0.status).toBe("wrong");
    expect(eval0.pointsAwarded).toBe(0);
  });

  it("correctly scores Final Four upset (2 seed beats chalk 1)", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    const ffGame = games.find((g) => g.id === "r5-0")!;
    ffGame.winner_id = "East-s2";
    ffGame.team1_id = "East-s1";
    ffGame.team2_id = "South-s2";

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r4-East-0", picked_team_id: "East-s2" },
      { game_id: "r4-South-0", picked_team_id: "East-s2" },
      { game_id: "r5-0", picked_team_id: "East-s2" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    // base=80, upset multiplier=15, diff=2-1=1, bonus=15
    expect(summary.perRound[5].basePoints).toBe(80);
    expect(summary.perRound[5].upsetPoints).toBe(15);
    expect(summary.perRound[5].totalPoints).toBe(95);
  });

  it("correctly scores Championship upset (4 seed beats chalk 1)", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    const champGame = games.find((g) => g.id === "r6-0")!;
    champGame.winner_id = "East-s4";

    const ffGame0 = games.find((g) => g.id === "r5-0")!;
    const ffGame1 = games.find((g) => g.id === "r5-1")!;

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r5-0", picked_team_id: "East-s4" },
      { game_id: "r5-1", picked_team_id: "East-s4" },
      { game_id: "r6-0", picked_team_id: "East-s4" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    // base=130, upset multiplier=20, diff=4-1=3, bonus=60
    expect(summary.perRound[6].basePoints).toBe(130);
    expect(summary.perRound[6].upsetPoints).toBe(60);
    expect(summary.perRound[6].totalPoints).toBe(190);
  });

  it("no upset bonus when 1-seed wins the Championship (chalk)", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    const champGame = games.find((g) => g.id === "r6-0")!;
    champGame.winner_id = "East-s1";

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r5-0", picked_team_id: "East-s1" },
      { game_id: "r5-1", picked_team_id: "East-s1" },
      { game_id: "r6-0", picked_team_id: "East-s1" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    expect(summary.perRound[6].basePoints).toBe(130);
    expect(summary.perRound[6].upsetPoints).toBe(0);
    expect(summary.perRound[6].totalPoints).toBe(130);
  });

  it("marks a pick as dead when the feeder pick was wrong", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Both round 1 feeder games for r2-East-0 decided; 1-seed loses both paths
    const r1g0 = games.find((g) => g.id === "r1-East-0")!;
    r1g0.winner_id = "East-s16"; // 16-seed upsets
    const r1g1 = games.find((g) => g.id === "r1-East-1")!;
    r1g1.winner_id = "East-s8"; // chalk

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s1" },
      { game_id: "r1-East-1", picked_team_id: "East-s1" },
      // User picked 1-seed to win round 2, but 1-seed lost both feeders
      { game_id: "r2-East-0", picked_team_id: "East-s1" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    const r2Eval = summary.perRound[2].evaluatedGames.find((e) => e.gameId === "r2-East-0");
    expect(r2Eval?.status).toBe("dead");
    expect(r2Eval?.pointsAwarded).toBe(0);
  });

  it("tracks possible points for alive picks", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Leave all games unplayed. User picks 1-seed to win round 1.
    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s1" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    // The pick is alive → 10 possible (no upset since chalk seed = 1)
    expect(summary.possibleBracketPoints).toBe(10);
    expect(summary.totalBracketPoints).toBe(0);
  });

  it("accumulates points correctly across multiple rounds and brackets", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Two games decided: round 1 East pos 0, round 1 East pos 1
    const g0 = games.find((g) => g.id === "r1-East-0")!;
    g0.winner_id = "East-s1";
    const g1 = games.find((g) => g.id === "r1-East-1")!;
    g1.winner_id = "East-s8";

    const b1 = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s1" },
      { game_id: "r1-East-1", picked_team_id: "East-s8" },
    ]);
    const b2 = makeBracket("b2", "user2", [
      { game_id: "r1-East-0", picked_team_id: "East-s16" },
      { game_id: "r1-East-1", picked_team_id: "East-s9" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [b1, b2],
      finalFourMatchups,
      poolGoodies: [],
    };

    const summaries = scoreBracketsForPool(ctx);
    const s1 = summaries.find((s) => s.userId === "user1")!;
    const s2 = summaries.find((s) => s.userId === "user2")!;

    expect(s1.perRound[1].gamesCorrect).toBe(2);
    expect(s1.perRound[1].totalPoints).toBe(20); // 10 + 10

    expect(s2.perRound[1].gamesCorrect).toBe(0);
    expect(s2.perRound[1].totalPoints).toBe(0);
  });

  it("computes upset bonus at every round (round 2 through round 4)", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Round 2 East pos 0: 8 seed beats chalk (chalk=1 for this slot)
    // Need to pretend a team won. Let's say 8-seed is in r2.
    const r2Game = games.find((g) => g.id === "r2-East-0")!;
    r2Game.winner_id = "East-s8";

    // Round 3 East pos 0: 5 seed beats chalk (chalk=1 for this slot)
    const r3Game = games.find((g) => g.id === "r3-East-0")!;
    r3Game.winner_id = "East-s5";

    // Round 4 East: 2 seed beats chalk (chalk=1)
    const r4Game = games.find((g) => g.id === "r4-East-0")!;
    r4Game.winner_id = "East-s2";

    // Build picks: user picks the feeder chain correctly for each
    const r1g0 = games.find((g) => g.id === "r1-East-0")!;
    r1g0.winner_id = "East-s1"; // 1 wins r1 (doesn't matter, we're testing r2+)

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s8" },
      { game_id: "r1-East-1", picked_team_id: "East-s8" },
      { game_id: "r2-East-0", picked_team_id: "East-s8" },
      { game_id: "r2-East-1", picked_team_id: "East-s5" },
      { game_id: "r3-East-0", picked_team_id: "East-s5" },
      { game_id: "r3-East-1", picked_team_id: "East-s2" },
      { game_id: "r4-East-0", picked_team_id: "East-s2" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);

    // Round 2: base=20, mult=3, diff=8-1=7, upset=21
    expect(summary.perRound[2].basePoints).toBe(20);
    expect(summary.perRound[2].upsetPoints).toBe(21);
    expect(summary.perRound[2].totalPoints).toBe(41);

    // Round 3: base=30, mult=5, diff=5-1=4, upset=20
    expect(summary.perRound[3].basePoints).toBe(30);
    expect(summary.perRound[3].upsetPoints).toBe(20);
    expect(summary.perRound[3].totalPoints).toBe(50);

    // Round 4: base=50, mult=10, diff=2-1=1, upset=10
    expect(summary.perRound[4].basePoints).toBe(50);
    expect(summary.perRound[4].upsetPoints).toBe(10);
    expect(summary.perRound[4].totalPoints).toBe(60);
  });
});

// ─── Lowest-seed goody scoring (via scoreBracketsForPool) ────────────────────

describe("lowest-seed goody scoring", () => {
  function makeLowestSeedGoody(
    round: number,
    key: string,
    points: number
  ): PoolGoodyWithType {
    return {
      id: `goody-${key}`,
      pool_id: "pool-1",
      goody_type_id: `gt-${key}`,
      points,
      stroke_rule_enabled: true,
      goody_types: {
        id: `gt-${key}`,
        key,
        name: key,
        description: null,
        default_points: points,
        input_type: "bracket_derived",
        config: null,
      },
    };
  }

  it("awards full points when one user picks the lowest seed winner", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Decide all round-1 games: all chalk except East pos 0 where 16 beats 1
    for (const g of games.filter((g) => g.round === 1)) {
      if (g.id === "r1-East-0") {
        g.winner_id = "East-s16";
      } else {
        const [seedA] = SEED_MATCHUPS[g.position];
        g.winner_id = `${g.region}-s${seedA}`;
      }
    }

    const goody = makeLowestSeedGoody(1, "lowest_seed_first_round", 50);

    // User1 correctly picked the 16-seed upset
    const b1 = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s16" },
    ]);
    // User2 picked chalk
    const b2 = makeBracket("b2", "user2", [
      { game_id: "r1-East-0", picked_team_id: "East-s1" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [b1, b2],
      finalFourMatchups,
      poolGoodies: [goody],
    };

    const summaries = scoreBracketsForPool(ctx);
    const s1 = summaries.find((s) => s.userId === "user1")!;
    const s2 = summaries.find((s) => s.userId === "user2")!;

    expect(s1.perGoody!["gt-lowest_seed_first_round"].status).toBe("won");
    expect(s1.perGoody!["gt-lowest_seed_first_round"].pointsAwarded).toBe(50);
    expect(s2.perGoody!["gt-lowest_seed_first_round"].status).toBe("not_awarded");
    expect(s2.perGoody!["gt-lowest_seed_first_round"].pointsAwarded).toBe(0);
  });

  it("stroke rule: splits points when nobody picked actual lowest seed", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // All round-1: chalk except East-0 (16 wins) and East-2 (12 wins)
    for (const g of games.filter((g) => g.round === 1)) {
      if (g.id === "r1-East-0") {
        g.winner_id = "East-s16";
      } else if (g.id === "r1-East-2") {
        g.winner_id = "East-s12";
      } else {
        const [seedA] = SEED_MATCHUPS[g.position];
        g.winner_id = `${g.region}-s${seedA}`;
      }
    }

    const goody = makeLowestSeedGoody(1, "lowest_seed_first_round", 50);

    // Nobody picked 16-seed, but two users picked 12-seed
    const b1 = makeBracket("b1", "user1", [
      { game_id: "r1-East-2", picked_team_id: "East-s12" },
    ]);
    const b2 = makeBracket("b2", "user2", [
      { game_id: "r1-East-2", picked_team_id: "East-s12" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [b1, b2],
      finalFourMatchups,
      poolGoodies: [goody],
    };

    const summaries = scoreBracketsForPool(ctx);
    const s1 = summaries.find((s) => s.userId === "user1")!;
    const s2 = summaries.find((s) => s.userId === "user2")!;

    // Stroke rule: ceil(50/2) = 25 each
    expect(s1.perGoody!["gt-lowest_seed_first_round"].status).toBe("stroke");
    expect(s1.perGoody!["gt-lowest_seed_first_round"].pointsAwarded).toBe(25);
    expect(s2.perGoody!["gt-lowest_seed_first_round"].pointsAwarded).toBe(25);
  });

  it("shows alive/pending when round not yet complete", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Only 1 game decided, rest still unplayed
    const g = games.find((g) => g.id === "r1-East-0")!;
    g.winner_id = "East-s1";

    const goody = makeLowestSeedGoody(1, "lowest_seed_first_round", 50);

    const b1 = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s1" },
      { game_id: "r1-East-1", picked_team_id: "East-s9" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [b1],
      finalFourMatchups,
      poolGoodies: [goody],
    };

    const [summary] = scoreBracketsForPool(ctx);
    expect(summary.perGoody!["gt-lowest_seed_first_round"].status).toBe("alive");
    expect(summary.perGoody!["gt-lowest_seed_first_round"].pointsAwarded).toBe(0);
  });
});

// ─── Best Region Bracket goody (via scoreBracketsForPool) ────────────────────

describe("best region bracket goody", () => {
  function makeBestRegionGoody(): PoolGoodyWithType {
    return {
      id: "goody-brb",
      pool_id: "pool-1",
      goody_type_id: "gt-best-region",
      points: 30,
      stroke_rule_enabled: false,
      goody_types: {
        id: "gt-best-region",
        key: "best_region_bracket",
        name: "Best Region Bracket",
        description: null,
        default_points: 30,
        input_type: "bracket_derived",
        config: null,
      },
    };
  }

  it("awards points when all regions are complete", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Complete all region games (rounds 1-4) with chalk winners
    for (const g of games.filter((g) => g.round >= 1 && g.round <= 4)) {
      if (g.round === 1) {
        const [seedA] = SEED_MATCHUPS[g.position];
        g.winner_id = `${g.region}-s${seedA}`;
      } else {
        g.winner_id = `${g.region}-s1`;
      }
    }

    const goody = makeBestRegionGoody();

    // User1 gets all East correct, none elsewhere
    const picks: { game_id: string; picked_team_id: string }[] = [];
    for (const g of games.filter((g) => g.region === "East" && g.round >= 1 && g.round <= 4)) {
      picks.push({ game_id: g.id, picked_team_id: g.winner_id! });
    }
    const b1 = makeBracket("b1", "user1", picks);

    // User2 gets nothing correct
    const b2 = makeBracket("b2", "user2", []);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [b1, b2],
      finalFourMatchups,
      poolGoodies: [goody],
    };

    const summaries = scoreBracketsForPool(ctx);
    const s1 = summaries.find((s) => s.userId === "user1")!;
    const s2 = summaries.find((s) => s.userId === "user2")!;

    expect(s1.perGoody!["gt-best-region"].status).toBe("won");
    expect(s1.perGoody!["gt-best-region"].pointsAwarded).toBe(30);
    expect(s2.perGoody!["gt-best-region"].status).toBe("not_awarded");
  });

  it("shows alive when regions not yet complete", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();

    // Only complete round 1 East
    for (const g of games.filter((g) => g.round === 1 && g.region === "East")) {
      const [seedA] = SEED_MATCHUPS[g.position];
      g.winner_id = `${g.region}-s${seedA}`;
    }

    const goody = makeBestRegionGoody();
    const picks = games
      .filter((g) => g.round === 1 && g.region === "East")
      .map((g) => ({ game_id: g.id, picked_team_id: g.winner_id! }));
    const b1 = makeBracket("b1", "user1", picks);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [b1],
      finalFourMatchups,
      poolGoodies: [goody],
    };

    const [summary] = scoreBracketsForPool(ctx);
    expect(summary.perGoody!["gt-best-region"].status).toBe("alive");
    expect(summary.perGoody!["gt-best-region"].bestRegion).toBe("East");
  });
});

// ─── extractUserInputAnswer ──────────────────────────────────────────────────

describe("extractUserInputAnswer", () => {
  it("extracts nit_champion from nit_matchup", () => {
    expect(extractUserInputAnswer("nit_champion", { nit_matchup: "TeamA vs TeamB" }))
      .toBe("TeamA vs TeamB");
  });

  it("extracts first_conference_out from conference_key", () => {
    expect(extractUserInputAnswer("first_conference_out", { conference_key: "ACC" }))
      .toBe("ACC");
  });

  it("extracts dark_horse_champion from team_id", () => {
    expect(extractUserInputAnswer("dark_horse_champion", { team_id: "t-123" }))
      .toBe("t-123");
  });

  it("extracts biggest_first_round_blowout from game_id", () => {
    expect(extractUserInputAnswer("biggest_first_round_blowout", { game_id: "g-456" }))
      .toBe("g-456");
  });

  it("returns null for unknown goody key", () => {
    expect(extractUserInputAnswer("unknown", { something: "val" })).toBeNull();
  });

  it("returns null for null answer", () => {
    expect(extractUserInputAnswer("nit_champion", null)).toBeNull();
  });
});

// ─── getBracketDerivedGoodyAnswer ────────────────────────────────────────────

describe("getBracketDerivedGoodyAnswer", () => {
  it("returns the highest-seeded team picked to win in target round", () => {
    const teams: Team[] = [
      makeTeam("t1", 1, "East"),
      makeTeam("t5", 5, "East"),
      makeTeam("t12", 12, "East"),
    ];
    const games: TournamentGame[] = [
      makeGame("g1", 1, 0, { region: "East" }),
      makeGame("g2", 1, 1, { region: "East" }),
      makeGame("g3", 1, 2, { region: "East" }),
    ];
    const picks = [
      { game_id: "g1", picked_team_id: "t1" },
      { game_id: "g2", picked_team_id: "t5" },
      { game_id: "g3", picked_team_id: "t12" },
    ];

    const result = getBracketDerivedGoodyAnswer(picks, games, teams, "lowest_seed_first_round");
    expect(result?.seed).toBe(12);
    expect(result?.teamId).toBe("t12");
  });

  it("returns null for unknown goody key", () => {
    expect(getBracketDerivedGoodyAnswer([], [], [], "unknown")).toBeNull();
  });

  it("returns null when no picks match the target round", () => {
    const teams = [makeTeam("t1", 1, "East")];
    const games = [makeGame("g1", 2, 0, { region: "East" })]; // round 2
    const picks = [{ game_id: "g1", picked_team_id: "t1" }];

    const result = getBracketDerivedGoodyAnswer(picks, games, teams, "lowest_seed_first_round");
    expect(result).toBeNull();
  });
});

// ─── scoreUserInputGoodies ───────────────────────────────────────────────────

describe("scoreUserInputGoodies", () => {
  function makeUserInputGoody(
    key: string,
    points: number,
    opts: { strokeEnabled?: boolean; scoringMode?: string } = {}
  ): PoolGoodyWithType {
    return {
      id: `goody-${key}`,
      pool_id: "pool-1",
      goody_type_id: `gt-${key}`,
      points,
      stroke_rule_enabled: opts.strokeEnabled ?? false,
      scoring_mode: (opts.scoringMode as any) ?? "fixed",
      goody_types: {
        id: `gt-${key}`,
        key,
        name: key,
        description: null,
        default_points: points,
        input_type: "user_input",
        config: null,
      },
    };
  }

  describe("NIT champion", () => {
    it("awards full points for correct pick", () => {
      const goody = makeUserInputGoody("nit_champion", 20);
      const results: GoodyResultRow[] = [
        { goody_type_id: "gt-nit_champion", value: { winner: "TeamX" } },
      ];
      const answers = [
        { userId: "u1", goodyTypeId: "gt-nit_champion", value: { nit_matchup: "TeamX" } },
        { userId: "u2", goodyTypeId: "gt-nit_champion", value: { nit_matchup: "TeamY" } },
      ];

      const scores = scoreUserInputGoodies([goody], results, answers);
      expect(scores.get("u1")!.get("gt-nit_champion")!.pointsAwarded).toBe(20);
      expect(scores.get("u1")!.get("gt-nit_champion")!.status).toBe("won");
      expect(scores.get("u2")!.get("gt-nit_champion")!.pointsAwarded).toBe(0);
      expect(scores.get("u2")!.get("gt-nit_champion")!.status).toBe("not_awarded");
    });

    it("pending when no result set yet", () => {
      const goody = makeUserInputGoody("nit_champion", 20);
      const answers = [
        { userId: "u1", goodyTypeId: "gt-nit_champion", value: { nit_matchup: "TeamX" } },
      ];

      const scores = scoreUserInputGoodies([goody], [], answers);
      expect(scores.get("u1")!.get("gt-nit_champion")!.status).toBe("pending");
    });
  });

  describe("tiered stroke rule", () => {
    it("awards stroke points to closest tier when nobody got the winner", () => {
      const goody = makeUserInputGoody("nit_champion", 30, { strokeEnabled: true });
      const results: GoodyResultRow[] = [
        {
          goody_type_id: "gt-nit_champion",
          value: {
            winner: "TeamX",
            loser_tiers: [["TeamA", "TeamB"], ["TeamC"]],
          },
        },
      ];
      const answers = [
        { userId: "u1", goodyTypeId: "gt-nit_champion", value: { nit_matchup: "TeamA" } },
        { userId: "u2", goodyTypeId: "gt-nit_champion", value: { nit_matchup: "TeamB" } },
        { userId: "u3", goodyTypeId: "gt-nit_champion", value: { nit_matchup: "TeamC" } },
      ];

      const scores = scoreUserInputGoodies([goody], results, answers);
      // Tier 0 has two users: ceil(30 / 2) = 15 each
      expect(scores.get("u1")!.get("gt-nit_champion")!.pointsAwarded).toBe(15);
      expect(scores.get("u1")!.get("gt-nit_champion")!.status).toBe("stroke");
      expect(scores.get("u2")!.get("gt-nit_champion")!.pointsAwarded).toBe(15);
      // u3 picked tier 1 but tier 0 was hit first
      expect(scores.get("u3")!.get("gt-nit_champion")!.pointsAwarded).toBe(0);
      expect(scores.get("u3")!.get("gt-nit_champion")!.status).toBe("not_awarded");
    });

    it("falls through to tier 1 when no user picked tier 0", () => {
      const goody = makeUserInputGoody("nit_champion", 30, { strokeEnabled: true });
      const results: GoodyResultRow[] = [
        {
          goody_type_id: "gt-nit_champion",
          value: {
            winner: "TeamX",
            loser_tiers: [["TeamA"], ["TeamC"]],
          },
        },
      ];
      const answers = [
        { userId: "u1", goodyTypeId: "gt-nit_champion", value: { nit_matchup: "TeamC" } },
      ];

      const scores = scoreUserInputGoodies([goody], results, answers);
      // Only user in tier 1: ceil(30/1) = 30
      expect(scores.get("u1")!.get("gt-nit_champion")!.pointsAwarded).toBe(30);
      expect(scores.get("u1")!.get("gt-nit_champion")!.status).toBe("stroke");
    });
  });

  describe("dark horse champion", () => {
    function buildDarkHorseCtx(opts: {
      champWinnerId?: string | null;
      bracketChampPicks?: { userId: string; teamId: string }[];
      eliminatedTeams?: string[];
    }) {
      const teams = [
        makeTeam("t1", 1, "East"),
        makeTeam("t2", 2, "East"),
        makeTeam("t3", 3, "East"),
        makeTeam("t7", 7, "East"),
      ];
      const champGame = makeGame("champ", 6, 0, {
        team1_id: "t1",
        team2_id: "t7",
        winner_id: opts.champWinnerId ?? null,
      });
      const games: TournamentGame[] = [champGame];

      // Add games to eliminate teams
      for (const tid of opts.eliminatedTeams ?? []) {
        games.push(
          makeGame(`elim-${tid}`, 1, 0, {
            region: "East",
            team1_id: tid,
            team2_id: "t1",
            winner_id: "t1",
          })
        );
      }

      const brackets: BracketWithPicks[] = (opts.bracketChampPicks ?? []).map((p, i) =>
        makeBracket(`b${i}`, p.userId, [
          { game_id: "champ", picked_team_id: p.teamId },
        ])
      );

      const pool = makePool();
      const ctx: PoolScoringContext = {
        pool,
        games,
        teams,
        brackets,
        finalFourMatchups: [["East", "South"], ["West", "Midwest"]],
        poolGoodies: [],
      };

      return ctx;
    }

    it("awards points when dark horse team wins championship", () => {
      const ctx = buildDarkHorseCtx({
        champWinnerId: "t7",
        bracketChampPicks: [{ userId: "u1", teamId: "t1" }],
      });

      const goody = makeUserInputGoody("dark_horse_champion", 100, { scoringMode: "fixed" });
      const answers = [
        { userId: "u1", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t7" } },
      ];

      const scores = scoreUserInputGoodies([goody], [], answers, ctx);
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.pointsAwarded).toBe(100);
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.status).toBe("won");
    });

    it("eliminates a 1/2 seed that someone picked as bracket champion", () => {
      const ctx = buildDarkHorseCtx({
        champWinnerId: null,
        bracketChampPicks: [{ userId: "u2", teamId: "t2" }],
      });

      const goody = makeUserInputGoody("dark_horse_champion", 100);
      const answers = [
        { userId: "u1", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t2" } },
      ];

      const scores = scoreUserInputGoodies([goody], [], answers, ctx);
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.status).toBe("eliminated");
    });

    it("allows a 1/2 seed dark horse if nobody picked it as bracket champ", () => {
      const ctx = buildDarkHorseCtx({
        champWinnerId: null,
        bracketChampPicks: [{ userId: "u2", teamId: "t1" }],
      });

      const goody = makeUserInputGoody("dark_horse_champion", 100);
      const answers = [
        { userId: "u1", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t2" } },
      ];

      const scores = scoreUserInputGoodies([goody], [], answers, ctx);
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.status).toBe("alive");
    });

    it("eliminates dark horse when team is knocked out of tournament", () => {
      const ctx = buildDarkHorseCtx({
        champWinnerId: null,
        eliminatedTeams: ["t7"],
      });

      const goody = makeUserInputGoody("dark_horse_champion", 100);
      const answers = [
        { userId: "u1", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t7" } },
      ];

      const scores = scoreUserInputGoodies([goody], [], answers, ctx);
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.status).toBe("eliminated");
    });

    it("stroke rule: splits points when multiple users pick the winning dark horse", () => {
      const ctx = buildDarkHorseCtx({
        champWinnerId: "t7",
        bracketChampPicks: [{ userId: "u1", teamId: "t1" }],
      });

      const goody = makeUserInputGoody("dark_horse_champion", 100);
      const answers = [
        { userId: "u1", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t7" } },
        { userId: "u2", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t7" } },
        { userId: "u3", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t3" } },
      ];

      const scores = scoreUserInputGoodies([goody], [], answers, ctx);
      // 2 winners: ceil(100/2) = 50 each
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.pointsAwarded).toBe(50);
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.status).toBe("stroke");
      expect(scores.get("u2")!.get("gt-dark_horse_champion")!.pointsAwarded).toBe(50);
      // u3 picked wrong team → eliminated (champ already decided)
      expect(scores.get("u3")!.get("gt-dark_horse_champion")!.status).toBe("eliminated");
    });

    it("bracket_upset_points mode adds upset bonus to dark horse points", () => {
      const ctx = buildDarkHorseCtx({
        champWinnerId: "t7",
        bracketChampPicks: [{ userId: "u1", teamId: "t1" }],
      });

      const goody = makeUserInputGoody("dark_horse_champion", 100, {
        scoringMode: "bracket_upset_points",
      });
      const answers = [
        { userId: "u1", goodyTypeId: "gt-dark_horse_champion", value: { team_id: "t7" } },
      ];

      const scores = scoreUserInputGoodies([goody], [], answers, ctx);
      // base=130 (round 6), upset: 7-seed vs chalk 1, diff=6, mult=20, bonus=120
      // total = 130 + 120 = 250
      expect(scores.get("u1")!.get("gt-dark_horse_champion")!.pointsAwarded).toBe(250);
    });
  });

  describe("first conference out with conference_multiplier", () => {
    it("multiplies points by team count", () => {
      const goody: PoolGoodyWithType = {
        id: "goody-fco",
        pool_id: "pool-1",
        goody_type_id: "gt-fco",
        points: 20,
        stroke_rule_enabled: false,
        scoring_mode: "conference_multiplier",
        scoring_config: { conference_multiplier: 4 },
        goody_types: {
          id: "gt-fco",
          key: "first_conference_out",
          name: "First Conference Out",
          description: null,
          default_points: 20,
          input_type: "user_input",
          config: null,
        },
      };
      const results: GoodyResultRow[] = [
        { goody_type_id: "gt-fco", value: { winner: "ACC" } },
      ];
      const answers = [
        { userId: "u1", goodyTypeId: "gt-fco", value: { conference_key: "ACC" } },
      ];

      const scoringCtx: PoolScoringContext = {
        pool: makePool(),
        games: [],
        teams: [],
        brackets: [],
        finalFourMatchups: [],
        poolGoodies: [goody],
        conferenceTeamCounts: { ACC: 7, SEC: 8 },
      };

      const scores = scoreUserInputGoodies([goody], results, answers, scoringCtx);
      // 4 * 7 = 28
      expect(scores.get("u1")!.get("gt-fco")!.pointsAwarded).toBe(28);
      expect(scores.get("u1")!.get("gt-fco")!.status).toBe("won");
    });
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles empty games/teams gracefully", () => {
    const pool = makePool();
    const ctx: PoolScoringContext = {
      pool,
      games: [],
      teams: [],
      brackets: [makeBracket("b1", "u1", [])],
      finalFourMatchups: [],
      poolGoodies: [],
    };
    expect(scoreBracketsForPool(ctx)).toEqual([]);
  });

  it("handles a bracket with no picks", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool();
    const g = games.find((g) => g.id === "r1-East-0")!;
    g.winner_id = "East-s1";

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [makeBracket("b1", "u1", [])],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    expect(summary.totalBracketPoints).toBe(0);
    expect(summary.perRound[1].gamesCorrect).toBe(0);
  });

  it("upset bonus math: odd stroke split rounds up with ceil", () => {
    // 3 users split 50 points → ceil(50/3) = 17 each
    expect(Math.ceil(50 / 3)).toBe(17);
  });

  it("custom round points and multipliers work end-to-end", () => {
    const { teams, games, finalFourMatchups } = buildFullTournament();
    const pool = makePool({
      round_points: { "1": 5, "2": 10, "3": 15, "4": 25, "5": 40, "6": 65 },
      upset_multipliers: { "1": 2, "2": 4, "3": 8, "4": 12, "5": 18, "6": 25 },
    });

    // 16 seed wins round 1 East pos 0
    const g = games.find((g) => g.id === "r1-East-0")!;
    g.winner_id = "East-s16";

    const bracket = makeBracket("b1", "user1", [
      { game_id: "r1-East-0", picked_team_id: "East-s16" },
    ]);

    const ctx: PoolScoringContext = {
      pool,
      games,
      teams,
      brackets: [bracket],
      finalFourMatchups,
      poolGoodies: [],
    };

    const [summary] = scoreBracketsForPool(ctx);
    // base=5, mult=2, diff=15, upset=30
    expect(summary.perRound[1].basePoints).toBe(5);
    expect(summary.perRound[1].upsetPoints).toBe(30);
    expect(summary.perRound[1].totalPoints).toBe(35);
  });
});
