"use server";

import { createClient } from "@/utils/supabase/server";
import {
  updatePoolScoringSettings,
  updatePoolDetails,
  setPoolGoodies,
  ScoringSettings,
} from "@/lib/pools";
import {
  RoundPoints,
  UpsetMultipliers,
  DEFAULT_ROUND_POINTS,
  DEFAULT_UPSET_MULTIPLIERS,
} from "@/lib/types";

export interface UpdatePoolSettingsState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    name?: string;
  };
}

const ROUND_KEYS = ["1", "2", "3", "4", "5", "6"] as const;

function parseRoundPoints(formData: FormData): RoundPoints {
  const points: RoundPoints = {};
  for (const key of ROUND_KEYS) {
    const raw = formData.get(`round_points_${key}`);
    const val = raw ? Number(raw) : undefined;
    points[key] = val !== undefined && !isNaN(val) && val >= 0 ? val : DEFAULT_ROUND_POINTS[key];
  }
  return points;
}

function parseUpsetMultipliers(formData: FormData): UpsetMultipliers {
  const multipliers: UpsetMultipliers = {};
  for (const key of ROUND_KEYS) {
    const raw = formData.get(`upset_multiplier_${key}`);
    const val = raw ? Number(raw) : undefined;
    multipliers[key] = val !== undefined && !isNaN(val) && val >= 0 ? val : DEFAULT_UPSET_MULTIPLIERS[key];
  }
  return multipliers;
}

function parseGoodies(formData: FormData): {
  goody_type_id: string;
  points: number;
  stroke_rule_enabled: boolean;
}[] {
  const ids = formData.getAll("goody_ids") as string[];
  return ids.map((id) => {
    const raw = formData.get(`goody_points_${id}`);
    const pts = raw ? Number(raw) : 5;
    const strokeRule = formData.get(`goody_stroke_rule_${id}`) === "true";
    return {
      goody_type_id: id,
      points: isNaN(pts) || pts < 0 ? 5 : pts,
      stroke_rule_enabled: strokeRule,
    };
  });
}

export async function updatePoolSettingsAction(
  _prevState: UpdatePoolSettingsState,
  formData: FormData
): Promise<UpdatePoolSettingsState> {
  const poolId = formData.get("pool_id") as string | null;
  if (!poolId) {
    return { error: "Missing pool ID." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: pool } = await supabase
    .from("pools")
    .select("creator_id")
    .eq("id", poolId)
    .single();

  if (!pool || pool.creator_id !== user.id) {
    return { error: "You do not have permission to edit this pool." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const imageUrl = (formData.get("image_url") as string | null)?.trim() ?? "";

  if (!name) {
    return { fieldErrors: { name: "Pool name is required." } };
  }
  if (name.length > 50) {
    return { fieldErrors: { name: "Pool name must be 50 characters or fewer." } };
  }

  const detailsResult = await updatePoolDetails(supabase, poolId, {
    name,
    image_url: imageUrl || null,
  });
  if (!detailsResult.success) {
    return { error: detailsResult.error ?? "Failed to update pool details." };
  }

  const scoring: ScoringSettings = {
    round_points: parseRoundPoints(formData),
    upset_points_enabled: formData.get("upset_points_enabled") === "true",
    upset_multipliers: parseUpsetMultipliers(formData),
    goodies_enabled: formData.get("goodies_enabled") === "true",
  };

  const result = await updatePoolScoringSettings(supabase, poolId, scoring);
  if (!result.success) {
    return { error: result.error ?? "Failed to update settings." };
  }

  if (scoring.goodies_enabled) {
    const goodies = parseGoodies(formData);
    const goodyResult = await setPoolGoodies(supabase, poolId, goodies);
    if (!goodyResult.success) {
      return { error: goodyResult.error ?? "Failed to update goodies." };
    }
  } else {
    await setPoolGoodies(supabase, poolId, []);
  }

  return { success: true };
}
