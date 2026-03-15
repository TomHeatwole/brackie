export type TournamentStatus = "upcoming" | "active" | "completed";

export interface Tournament {
  id: string;
  name: string;
  year: number;
  lock_date: string | null;
  status: TournamentStatus;
  /** Region name in top-left quadrant */
  region_top_left?: string;
  /** Region name in top-right quadrant */
  region_top_right?: string;
  /** Region name in bottom-left quadrant */
  region_bottom_left?: string;
  /** Region name in bottom-right quadrant */
  region_bottom_right?: string;
}

/** Quadrant layout and Final Four matchups derived from tournament bracket structure. */
export interface BracketStructure {
  /** [topLeft, topRight, bottomLeft, bottomRight] for display order and tabs */
  regionsInOrder: [string, string, string, string];
  /** FF game 0: [regionA, regionB], FF game 1: [regionC, regionD]. Default: [[topLeft, topRight], [bottomLeft, bottomRight]]. */
  finalFourMatchups: [string, string][];
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  seed: number;
  region: string;
  /** Optional icon URL (e.g. transparent logo). When null, UI shows circular initial. */
  icon_url?: string | null;
}

export interface TournamentGame {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  region: string | null;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
}

export interface Bracket {
  id: string;
  user_id: string;
  tournament_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface BracketPick {
  id: string;
  bracket_id: string;
  game_id: string;
  picked_team_id: string;
}

export type RoundPoints = Record<string, number>;
export type UpsetMultipliers = Record<string, number>;

export const DEFAULT_ROUND_POINTS: RoundPoints = {
  "1": 10,
  "2": 20,
  "3": 30,
  "4": 50,
  "5": 80,
  "6": 130,
};

export const DEFAULT_UPSET_MULTIPLIERS: UpsetMultipliers = {
  "1": 1,
  "2": 3,
  "3": 5,
  "4": 10,
  "5": 15,
  "6": 20,
};

export interface Pool {
  id: string;
  name: string;
  creator_id: string;
  tournament_id: string;
  invite_code: string;
  round_points: RoundPoints;
  upset_points_enabled: boolean;
  upset_multipliers: UpsetMultipliers;
  goodies_enabled: boolean;
  image_url: string | null;
  created_at: string;
}

export type GoodyInputType = "bracket_derived" | "user_input";

export interface GoodyType {
  id: string;
  key: string;
  name: string;
  description: string | null;
  default_points: number;
  input_type: GoodyInputType;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface PoolGoody {
  id: string;
  pool_id: string;
  goody_type_id: string;
  points: number;
  stroke_rule_enabled: boolean;
}

/** User-input goody answer per (pool_bracket, goody_type). value shape varies by goody key. */
export interface PoolBracketGoodyAnswer {
  id: string;
  pool_bracket_id: string;
  goody_type_id: string;
  value: Record<string, unknown>;
}

/** Elite conferences for "First conference out" goody. */
export const ELITE_CONFERENCES = [
  "ACC",
  "Big Ten",
  "Big 12",
  "SEC",
  "Big East",
  "Pac-12",
  "American",
  "Mountain West",
  "WCC",
] as const;
export type EliteConferenceKey = (typeof ELITE_CONFERENCES)[number];

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  joined_at: string;
}

export interface PoolBracket {
  id: string;
  pool_id: string;
  bracket_id: string;
  user_id: string;
}

export interface PoolWithDetails extends Pool {
  member_count: number;
  creator_first_name?: string | null;
  creator_last_name?: string | null;
}

export interface PoolMemberWithInfo extends PoolMember {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  bracket_submitted?: boolean;
  bracket_name?: string;
  bracket_id?: string;
}

export interface BracketWithPicks extends Bracket {
  picks: BracketPick[];
  pick_count: number;
  champion_name?: string;
  champion_seed?: number;
  champion_icon_url?: string | null;
}

export const REGIONS = ["East", "West", "South", "Midwest"] as const;
export type Region = (typeof REGIONS)[number];

export const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

export const GAMES_PER_ROUND: Record<number, number> = {
  1: 32,
  2: 16,
  3: 8,
  4: 4,
  5: 2,
  6: 1,
};

export const TOTAL_GAMES = 63;

export const SEED_MATCHUPS: [number, number][] = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
];

export const FINAL_FOUR_MATCHUPS: [Region, Region][] = [
  ["East", "West"],
  ["South", "Midwest"],
];

/** Build bracket structure from tournament. Uses defaults (East, West, South, Midwest) when fields missing. */
export function getBracketStructure(tournament: Tournament | null): BracketStructure {
  const topLeft = tournament?.region_top_left ?? "East";
  const topRight = tournament?.region_top_right ?? "West";
  const bottomLeft = tournament?.region_bottom_left ?? "South";
  const bottomRight = tournament?.region_bottom_right ?? "Midwest";
  return {
    regionsInOrder: [topLeft, topRight, bottomLeft, bottomRight],
    finalFourMatchups: [
      [topLeft, topRight],
      [bottomLeft, bottomRight],
    ],
  };
}
