import { SupabaseClient } from "@supabase/supabase-js";
import { GoodyType } from "./types";

export const HIDDEN_GOODY_KEYS: readonly string[] = ["sixteen_seed_bonus"];

export const GOODY_DISPLAY_ORDER: Record<string, number> = {
  nit_champion: 0,
  biggest_first_round_blowout: 1,
  first_conference_out: 2,
  dark_horse_champion: 3,
  lowest_seed_first_round: 4,
  lowest_seed_sweet_16: 5,
  lowest_seed_elite_eight: 6,
  lowest_seed_final_four: 7,
  best_region_bracket: 8,
};

export function goodyDisplayOrder(key: string): number {
  return GOODY_DISPLAY_ORDER[key] ?? 999;
}

export interface GoodyResultRow {
  goody_type_id: string;
  value: Record<string, unknown>;
}

export async function getGoodyResults(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<GoodyResultRow[]> {
  const { data } = await supabase
    .from("goody_results")
    .select("goody_type_id, value")
    .eq("tournament_id", tournamentId);

  return (data ?? []).map((r: { goody_type_id: string; value: unknown }) => ({
    goody_type_id: r.goody_type_id,
    value: r.value as Record<string, unknown>,
  }));
}

export async function getGoodyTypes(
  supabase: SupabaseClient
): Promise<GoodyType[]> {
  const { data, error } = await supabase
    .from("goody_types")
    .select("*")
    .order("name");

  if (error) {
    console.error("getGoodyTypes error:", error.message, error.details);
    return [];
  }

  return (data ?? []).filter((gt) => !HIDDEN_GOODY_KEYS.includes(gt.key));
}
