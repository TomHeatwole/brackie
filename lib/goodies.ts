import { SupabaseClient } from "@supabase/supabase-js";
import { GoodyType } from "./types";

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

  return data ?? [];
}
