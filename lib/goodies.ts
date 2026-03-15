import { SupabaseClient } from "@supabase/supabase-js";
import { GoodyType } from "./types";

export async function getGoodyTypes(
  supabase: SupabaseClient
): Promise<GoodyType[]> {
  const { data } = await supabase
    .from("goody_types")
    .select("*")
    .order("name");

  return data ?? [];
}
