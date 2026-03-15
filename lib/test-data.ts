import {
  Tournament,
  Team,
  TournamentGame,
  REGIONS,
  SEED_MATCHUPS,
  FINAL_FOUR_MATCHUPS,
  Region,
} from "./types";

const TEST_TOURNAMENT_ID = "test-tournament-2026";

const TEAM_NAMES: Record<Region, string[]> = {
  East: [
    "Crimson Hawks",
    "Blue Devils",
    "Golden Bears",
    "Silver Wolves",
    "Green Dragons",
    "Purple Knights",
    "Red Foxes",
    "Black Panthers",
    "White Eagles",
    "Orange Tigers",
    "Teal Sharks",
    "Bronze Rams",
    "Ivory Owls",
    "Scarlet Lions",
    "Navy Stallions",
    "Copper Cobras",
  ],
  West: [
    "Storm Chasers",
    "Fire Phoenixes",
    "Iron Bulldogs",
    "Thunder Bolts",
    "Ocean Waves",
    "Desert Hawks",
    "Mountain Lions",
    "Forest Rangers",
    "River Otters",
    "Prairie Wolves",
    "Canyon Eagles",
    "Glacier Bears",
    "Valley Vipers",
    "Sunset Falcons",
    "Tundra Yaks",
    "Coral Crabs",
  ],
  South: [
    "Royal Jaguars",
    "Diamond Rattlers",
    "Platinum Mustangs",
    "Jade Scorpions",
    "Amber Hornets",
    "Obsidian Ravens",
    "Sapphire Dolphins",
    "Ruby Wildcats",
    "Emerald Turtles",
    "Topaz Cougars",
    "Pearl Pelicans",
    "Garnet Gators",
    "Onyx Bison",
    "Citrine Cranes",
    "Opal Antelopes",
    "Quartz Armadillos",
  ],
  Midwest: [
    "Steel Titans",
    "Maple Monarchs",
    "Granite Grizzlies",
    "Cedar Spartans",
    "Birch Badgers",
    "Pine Lancers",
    "Oak Trojans",
    "Elm Pioneers",
    "Ash Miners",
    "Willow Warhawks",
    "Cypress Cyclones",
    "Magnolia Mavericks",
    "Hickory Huskies",
    "Redwood Raiders",
    "Sequoia Sentinels",
    "Palm Paladins",
  ],
};

function makeTeamId(region: string, seed: number): string {
  return `test-team-${region.toLowerCase()}-${seed}`;
}

function makeGameId(round: number, region: string | null, position: number): string {
  const regionPart = region ? region.toLowerCase() : "final";
  return `test-game-r${round}-${regionPart}-${position}`;
}

function buildTeams(): Team[] {
  const teams: Team[] = [];
  for (const region of REGIONS) {
    for (let seed = 1; seed <= 16; seed++) {
      teams.push({
        id: makeTeamId(region, seed),
        tournament_id: TEST_TOURNAMENT_ID,
        name: TEAM_NAMES[region][seed - 1],
        seed,
        region,
      });
    }
  }
  return teams;
}

function buildGames(teams: Team[]): TournamentGame[] {
  const games: TournamentGame[] = [];
  const teamsByRegion = new Map<string, Map<number, Team>>();

  for (const team of teams) {
    if (!teamsByRegion.has(team.region)) {
      teamsByRegion.set(team.region, new Map());
    }
    teamsByRegion.get(team.region)!.set(team.seed, team);
  }

  for (const region of REGIONS) {
    const regionTeams = teamsByRegion.get(region)!;

    for (let pos = 0; pos < SEED_MATCHUPS.length; pos++) {
      const [seedA, seedB] = SEED_MATCHUPS[pos];
      games.push({
        id: makeGameId(1, region, pos),
        tournament_id: TEST_TOURNAMENT_ID,
        round: 1,
        position: pos,
        region,
        team1_id: regionTeams.get(seedA)!.id,
        team2_id: regionTeams.get(seedB)!.id,
        winner_id: null,
      });
    }

    for (let pos = 0; pos < 4; pos++) {
      games.push({
        id: makeGameId(2, region, pos),
        tournament_id: TEST_TOURNAMENT_ID,
        round: 2,
        position: pos,
        region,
        team1_id: null,
        team2_id: null,
        winner_id: null,
      });
    }

    for (let pos = 0; pos < 2; pos++) {
      games.push({
        id: makeGameId(3, region, pos),
        tournament_id: TEST_TOURNAMENT_ID,
        round: 3,
        position: pos,
        region,
        team1_id: null,
        team2_id: null,
        winner_id: null,
      });
    }

    games.push({
      id: makeGameId(4, region, 0),
      tournament_id: TEST_TOURNAMENT_ID,
      round: 4,
      position: 0,
      region,
      team1_id: null,
      team2_id: null,
      winner_id: null,
    });
  }

  for (let pos = 0; pos < FINAL_FOUR_MATCHUPS.length; pos++) {
    games.push({
      id: makeGameId(5, null, pos),
      tournament_id: TEST_TOURNAMENT_ID,
      round: 5,
      position: pos,
      region: null,
      team1_id: null,
      team2_id: null,
      winner_id: null,
    });
  }

  games.push({
    id: makeGameId(6, null, 0),
    tournament_id: TEST_TOURNAMENT_ID,
    round: 6,
    position: 0,
    region: null,
    team1_id: null,
    team2_id: null,
    winner_id: null,
  });

  return games;
}

const testTeams = buildTeams();
const testGames = buildGames(testTeams);

export const TEST_TOURNAMENT: Tournament = {
  id: TEST_TOURNAMENT_ID,
  name: "NCAA March Madness 2026 (Test)",
  year: 2026,
  lock_date: "2026-03-19T12:00:00Z",
  status: "upcoming",
};

export const TEST_TEAMS: Team[] = testTeams;
export const TEST_GAMES: TournamentGame[] = testGames;

export function getTestTeamById(id: string): Team | undefined {
  return TEST_TEAMS.find((t) => t.id === id);
}

export function getTestTeamsByRegion(region: string): Team[] {
  return TEST_TEAMS.filter((t) => t.region === region);
}

export function getTestGamesByRound(round: number): TournamentGame[] {
  return TEST_GAMES.filter((g) => g.round === round);
}

export function getTestGamesByRegion(region: string): TournamentGame[] {
  return TEST_GAMES.filter((g) => g.region === region);
}

export function getFeederGameIds(game: TournamentGame): [string, string] | null {
  if (game.round === 1) return null;

  if (game.round <= 4 && game.region) {
    const prevRound = game.round - 1;
    const pos1 = game.position * 2;
    const pos2 = game.position * 2 + 1;
    return [
      makeGameId(prevRound, game.region, pos1),
      makeGameId(prevRound, game.region, pos2),
    ];
  }

  if (game.round === 5) {
    const [regionA, regionB] = FINAL_FOUR_MATCHUPS[game.position];
    return [makeGameId(4, regionA, 0), makeGameId(4, regionB, 0)];
  }

  if (game.round === 6) {
    return [makeGameId(5, null, 0), makeGameId(5, null, 1)];
  }

  return null;
}

export function getNextGameId(game: TournamentGame): string | null {
  if (game.round === 6) return null;

  if (game.round < 4 && game.region) {
    const nextRound = game.round + 1;
    const nextPos = Math.floor(game.position / 2);
    return makeGameId(nextRound, game.region, nextPos);
  }

  if (game.round === 4 && game.region) {
    const f4Idx = FINAL_FOUR_MATCHUPS.findIndex(
      ([a, b]) => a === game.region || b === game.region
    );
    if (f4Idx >= 0) return makeGameId(5, null, f4Idx);
  }

  if (game.round === 5) {
    return makeGameId(6, null, 0);
  }

  return null;
}

export function isTeam1Slot(game: TournamentGame, feederGame: TournamentGame): boolean {
  if (feederGame.round < 4 && feederGame.region) {
    return feederGame.position % 2 === 0;
  }
  if (feederGame.round === 4 && feederGame.region && game.round === 5) {
    const matchup = FINAL_FOUR_MATCHUPS[game.position];
    return feederGame.region === matchup[0];
  }
  if (feederGame.round === 5 && game.round === 6) {
    return feederGame.position === 0;
  }
  return true;
}
