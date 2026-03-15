"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  submitBracketToPool,
  getPoolGoodiesWithTypes,
  setPoolBracketGoodyAnswers,
} from "@/lib/pools";

export interface SubmitBracketFormState {
  error?: string;
  success?: boolean;
}

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

export async function submitBracketToPoolAction(
  _prevState: SubmitBracketFormState,
  formData: FormData
): Promise<SubmitBracketFormState> {
  const bracketId = formData.get("bracket_id") as string | null;
  const poolId = formData.get("pool_id") as string | null;

  if (!bracketId || !poolId) {
    return { error: "Missing required fields." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const result = await submitBracketToPool(supabase, poolId, bracketId, user.id);
  if (!result.success) {
    return { error: result.error ?? "Failed to submit bracket." };
  }

  const poolGoodiesWithTypes = await getPoolGoodiesWithTypes(supabase, poolId);
  const userInputGoodies = poolGoodiesWithTypes.filter(
    (pg) => pg.goody_types?.input_type === "user_input"
  );
  if (userInputGoodies.length > 0 && result.pool_bracket_id) {
    const answers = parseGoodyAnswers(formData, userInputGoodies);
    const answerResult = await setPoolBracketGoodyAnswers(
      supabase,
      result.pool_bracket_id,
      answers
    );
    if (!answerResult.success) {
      return { error: answerResult.error ?? "Failed to save goody answers." };
    }
  }

  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
