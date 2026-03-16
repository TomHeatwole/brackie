"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  getPoolGoodiesWithTypes,
  setPoolBracketGoodyAnswers,
} from "@/lib/pools";

function parseGoodyAnswers(
  formData: FormData,
  userInputGoodies: { goody_type_id: string; goody_types: { key: string } | null }[]
): { goody_type_id: string; value: Record<string, unknown> }[] {
  const answers: { goody_type_id: string; value: Record<string, unknown> }[] = [];
  for (const pg of userInputGoodies) {
    const raw = formData.get(`goody_${pg.goody_type_id}`) as string | null;
    if (raw == null || raw === "") continue;
    const key = pg.goody_types?.key ?? "";
    if (key === "first_conference_out") {
      answers.push({ goody_type_id: pg.goody_type_id, value: { conference_key: raw } });
    } else if (key === "nit_champion" || key === "dark_horse_champion") {
      answers.push({ goody_type_id: pg.goody_type_id, value: { team_id: raw } });
    } else if (key === "biggest_first_round_blowout") {
      answers.push({ goody_type_id: pg.goody_type_id, value: { game_id: raw } });
    }
  }
  return answers;
}

export async function saveGoodyPicksAction(formData: FormData): Promise<never> {
  const poolId = formData.get("pool_id") as string | null;
  const modeParam = (formData.get("mode_param") as string | null) ?? "";

  if (!poolId) {
    redirect("/pools");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/pools/${poolId}/goody-picks${modeParam}`)}`);
  }

  const { data: poolBracket } = await supabase
    .from("pool_brackets")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .single();

  if (!poolBracket) {
    redirect(`/pools/${poolId}${modeParam}`);
  }

  const poolGoodiesWithTypes = await getPoolGoodiesWithTypes(supabase, poolId);
  const userInputGoodies = poolGoodiesWithTypes.filter(
    (pg) => pg.goody_types?.input_type === "user_input"
  );
  const answers = parseGoodyAnswers(formData, userInputGoodies);

  await setPoolBracketGoodyAnswers(supabase, poolBracket.id, answers);

  redirect(`/pools/${poolId}${modeParam}`);
}
