"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createPool, setPoolGoodies, ScoringSettings, SetPoolGoodyInput } from "@/lib/pools";
import { getEffectiveTournament } from "@/lib/tournament";
import {
  RoundPoints,
  UpsetMultipliers,
  DEFAULT_ROUND_POINTS,
  DEFAULT_UPSET_MULTIPLIERS,
} from "@/lib/types";

export interface CreatePoolFormState {
  error?: string;
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

function parseGoodies(formData: FormData): SetPoolGoodyInput[] {
  const ids = formData.getAll("goody_ids") as string[];
  return ids.map((id) => {
    const raw = formData.get(`goody_points_${id}`);
    const pts = raw ? Number(raw) : 5;
    const strokeRule = formData.get(`goody_stroke_rule_${id}`) === "true";
    const scoringMode = (formData.get(`goody_scoring_mode_${id}`) as string) || "fixed";
    const multRaw = formData.get(`goody_conference_multiplier_${id}`);
    const conferenceMultiplier = multRaw != null ? Number(multRaw) : undefined;
    const scoringConfig =
      scoringMode === "conference_multiplier" && conferenceMultiplier != null && !isNaN(conferenceMultiplier) && conferenceMultiplier >= 1
        ? { conference_multiplier: conferenceMultiplier }
        : null;
    return {
      goody_type_id: id,
      points: isNaN(pts) || pts < 0 ? 5 : pts,
      stroke_rule_enabled: strokeRule,
      scoring_mode: scoringMode as "fixed" | "conference_multiplier" | "bracket_upset_points",
      scoring_config: scoringConfig,
    };
  });
}

export async function createPoolAction(
  _prevState: CreatePoolFormState,
  formData: FormData
): Promise<CreatePoolFormState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const imageUrl = (formData.get("image_url") as string | null)?.trim() ?? "";
  const mode = formData.get("mode") as string | null;
  const testMode = mode === "test";
  const overrideTournamentId =
    (formData.get("tournament_id") as string | null) ??
    (formData.get("tournament_ID") as string | null) ??
    null;

  if (!name) {
    return { fieldErrors: { name: "Pool name is required." } };
  }
  if (name.length > 50) {
    return { fieldErrors: { name: "Pool name must be 50 characters or fewer." } };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { tournament } = await getEffectiveTournament(supabase, {
    testMode,
    overrideTournamentId,
  });
  if (!tournament) {
    return { error: "No active tournament found." };
  }

  const scoring: ScoringSettings = {
    round_points: parseRoundPoints(formData),
    upset_points_enabled: formData.get("upset_points_enabled") === "true",
    upset_multipliers: parseUpsetMultipliers(formData),
    goodies_enabled: formData.get("goodies_enabled") === "true",
  };

  const pool = await createPool(supabase, user.id, name, tournament.id, scoring, imageUrl || null);
  if (!pool) {
    return { error: "Failed to create pool. Please try again." };
  }

  if (scoring.goodies_enabled) {
    const goodies = parseGoodies(formData);
    if (goodies.length > 0) {
      await setPoolGoodies(supabase, pool.id, goodies);
    }
  }

  const params = testMode ? "?mode=test" : "";
  redirect(`/pools/${pool.id}${params}`);
}
