export type TournamentStatus = "upcoming" | "active" | "completed";

export interface Tournament {
  id: string;
  name: string;
  year: number;
  lock_date: string | null;
  status: TournamentStatus;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  seed: number;
  region: string;
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

export interface Pool {
  id: string;
  name: string;
  creator_id: string;
  tournament_id: string;
  invite_code: string;
  created_at: string;
}

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
  creator_username?: string;
}

export interface PoolMemberWithInfo extends PoolMember {
  username?: string;
  first_name?: string;
  last_name?: string;
  bracket_submitted?: boolean;
  bracket_name?: string;
  bracket_id?: string;
}

export interface BracketWithPicks extends Bracket {
  picks: BracketPick[];
  pick_count: number;
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
