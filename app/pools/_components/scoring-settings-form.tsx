"use client";

import { useState } from "react";
import {
  ROUND_NAMES,
  RoundPoints,
  UpsetMultipliers,
  GoodyType,
  PoolGoody,
  GoodyScoringMode,
  DEFAULT_ROUND_POINTS,
  DEFAULT_UPSET_MULTIPLIERS,
} from "@/lib/types";

interface ScoringSettingsFormProps {
  roundPoints?: RoundPoints;
  upsetPointsEnabled?: boolean;
  upsetMultipliers?: UpsetMultipliers;
  goodiesEnabled?: boolean;
  goodyTypes: GoodyType[];
  poolGoodies?: PoolGoody[];
}

const ROUND_KEYS = ["1", "2", "3", "4", "5", "6"] as const;

export default function ScoringSettingsForm({
  roundPoints: initialRoundPoints,
  upsetPointsEnabled: initialUpsetEnabled,
  upsetMultipliers: initialUpsetMultipliers,
  goodiesEnabled: initialGoodiesEnabled,
  goodyTypes,
  poolGoodies: initialPoolGoodies,
}: ScoringSettingsFormProps) {
  const [upsetEnabled, setUpsetEnabled] = useState(initialUpsetEnabled ?? true);
  const [goodiesEnabled, setGoodiesEnabled] = useState(initialGoodiesEnabled ?? false);

  const rp = initialRoundPoints ?? DEFAULT_ROUND_POINTS;
  const um = initialUpsetMultipliers ?? DEFAULT_UPSET_MULTIPLIERS;

  const enabledGoodyIds = new Set(
    (initialPoolGoodies ?? []).map((pg) => pg.goody_type_id)
  );
  const goodyPointsMap = new Map(
    (initialPoolGoodies ?? []).map((pg) => [pg.goody_type_id, pg.points])
  );
  const goodyStrokeRuleMap = new Map(
    (initialPoolGoodies ?? []).map((pg) => [pg.goody_type_id, pg.stroke_rule_enabled])
  );
  const goodyScoringModeMap = new Map<string, GoodyScoringMode>(
    (initialPoolGoodies ?? []).map((pg) => [
      pg.goody_type_id,
      (pg.scoring_mode ?? "fixed") as GoodyScoringMode,
    ])
  );
  const goodyConferenceMultiplierMap = new Map(
    (initialPoolGoodies ?? []).map((pg) => [
      pg.goody_type_id,
      pg.scoring_config?.conference_multiplier ?? 5,
    ])
  );

  const [selectedGoodies, setSelectedGoodies] = useState<Set<string>>(enabledGoodyIds);
  const [scoringModeByGoodyId, setScoringModeByGoodyId] = useState<Map<string, GoodyScoringMode>>(() =>
    new Map((initialPoolGoodies ?? []).map((pg) => [pg.goody_type_id, (pg.scoring_mode ?? "fixed") as GoodyScoringMode]))
  );

  function setGoodyScoringMode(goodyId: string, mode: GoodyScoringMode) {
    setScoringModeByGoodyId((prev) => {
      const next = new Map(prev);
      next.set(goodyId, mode);
      return next;
    });
  }

  function toggleGoody(id: string) {
    setSelectedGoodies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Round Points */}
      <fieldset>
        <legend className="text-sm font-medium text-stone-300 mb-3">
          Points Per Round
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {ROUND_KEYS.map((key) => (
            <div key={key}>
              <label
                htmlFor={`round_points_${key}`}
                className="block text-xs text-muted-foreground mb-1"
              >
                {ROUND_NAMES[Number(key)]}
              </label>
              <input
                id={`round_points_${key}`}
                name={`round_points_${key}`}
                type="number"
                min={0}
                step={1}
                defaultValue={rp[key] ?? 0}
                className="input-field"
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Upset multipliers */}
      <fieldset>
        <div className="flex items-center justify-between mb-3">
          <legend className="text-sm font-medium text-stone-300">
            Upset multipliers
          </legend>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="upset_points_enabled"
              value="true"
              checked={upsetEnabled}
              onChange={(e) => setUpsetEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-card-border peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-stone-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          When enabled, set the multiplier per round for correctly picking an upset (lower seed beating higher seed).
        </p>
        {upsetEnabled && (
          <div className="grid grid-cols-2 gap-3">
            {ROUND_KEYS.map((key) => (
              <div key={key}>
                <label
                  htmlFor={`upset_multiplier_${key}`}
                  className="block text-xs text-muted-foreground mb-1"
                >
                  {ROUND_NAMES[Number(key)]}
                </label>
                <input
                  id={`upset_multiplier_${key}`}
                  name={`upset_multiplier_${key}`}
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={um[key] ?? 1}
                  className="input-field"
                />
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* Goodies */}
      <fieldset>
        <div className="flex items-center justify-between mb-2">
          <legend className="text-sm font-medium text-stone-300">
            Goodies
          </legend>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="goodies_enabled"
              value="true"
              checked={goodiesEnabled}
              onChange={(e) => setGoodiesEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-card-border peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-stone-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Bonus scoring categories. Turn on and pick which to use; set points and optional stroke rule per goodie.
        </p>
        {goodiesEnabled && (
          <div className="flex flex-col gap-2">
            {goodyTypes.length === 0 && (
              <p className="text-xs text-muted py-2">No goodies available yet.</p>
            )}
            {goodyTypes.map((goody) => {
              const isSelected = selectedGoodies.has(goody.id);
              return (
                <div
                  key={goody.id}
                  className={`rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-accent bg-card"
                      : "border-card-border bg-background/50 hover:border-card-border-hover hover:bg-background/80"
                  }`}
                  onClick={() => toggleGoody(goody.id)}
                >
                  <input
                    type="checkbox"
                    name="goody_ids"
                    value={goody.id}
                    checked={isSelected}
                    onChange={() => toggleGoody(goody.id)}
                    className="sr-only"
                  />
                  <div className="p-4 flex items-start gap-3">
                    <span
                      className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-stone-500 bg-transparent"
                      }`}
                      aria-hidden
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-stone-200 block">{goody.name}</span>
                      {goody.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goody.description}</p>
                      )}
                      {isSelected && (
                        <div
                          className="mt-4 pt-4 border-t border-card-border flex flex-wrap items-start gap-x-8 gap-y-4 rounded-lg bg-background/60 px-3 py-2 -mx-3 -mb-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-muted-foreground shrink-0">Stroke rule</span>
                            <label className="relative inline-flex shrink-0 cursor-pointer">
                              <input
                                type="checkbox"
                                name={`goody_stroke_rule_${goody.id}`}
                                value="true"
                                defaultChecked={goodyStrokeRuleMap.get(goody.id) ?? false}
                                className="sr-only peer"
                              />
                              <div className="relative w-9 h-5 rounded-full bg-card-border peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-stone-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                            </label>
                          </div>

                          {goody.key === "first_conference_out" && (
                            <div className="flex flex-wrap items-center gap-4 w-full">
                              <span className="text-xs text-muted-foreground shrink-0">Scoring</span>
                              <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`goody_scoring_mode_${goody.id}`}
                                    value="fixed"
                                    checked={(scoringModeByGoodyId.get(goody.id) ?? "fixed") === "fixed"}
                                    onChange={() => setGoodyScoringMode(goody.id, "fixed")}
                                    className="rounded-full border-card-border text-accent focus:ring-accent"
                                  />
                                  <span className="text-xs text-stone-300">Fixed points</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`goody_scoring_mode_${goody.id}`}
                                    value="conference_multiplier"
                                    checked={(scoringModeByGoodyId.get(goody.id) ?? "fixed") === "conference_multiplier"}
                                    onChange={() => setGoodyScoringMode(goody.id, "conference_multiplier")}
                                    className="rounded-full border-card-border text-accent focus:ring-accent"
                                  />
                                  <span className="text-xs text-stone-300">Conference size ×</span>
                                </label>
                                {(scoringModeByGoodyId.get(goody.id) ?? "fixed") === "conference_multiplier" ? (
                                  <input
                                    type="number"
                                    name={`goody_conference_multiplier_${goody.id}`}
                                    min={1}
                                    step={1}
                                    defaultValue={goodyConferenceMultiplierMap.get(goody.id) ?? 5}
                                    className="input-field w-16 py-1.5 text-center text-sm"
                                  />
                                ) : (
                                  <input
                                    type="hidden"
                                    name={`goody_conference_multiplier_${goody.id}`}
                                    value={goodyConferenceMultiplierMap.get(goody.id) ?? 5}
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          {goody.key === "dark_horse_champion" && (
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="text-xs text-muted-foreground shrink-0">Scoring</span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`goody_scoring_mode_${goody.id}`}
                                  value="fixed"
                                  checked={(scoringModeByGoodyId.get(goody.id) ?? "fixed") === "fixed"}
                                  onChange={() => setGoodyScoringMode(goody.id, "fixed")}
                                  className="rounded-full border-card-border text-accent focus:ring-accent"
                                />
                                <span className="text-xs text-stone-300">Fixed points</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`goody_scoring_mode_${goody.id}`}
                                  value="bracket_upset_points"
                                  checked={(scoringModeByGoodyId.get(goody.id) ?? "fixed") === "bracket_upset_points"}
                                  onChange={() => setGoodyScoringMode(goody.id, "bracket_upset_points")}
                                  className="rounded-full border-card-border text-accent focus:ring-accent"
                                />
                                <span className="text-xs text-stone-300">Bracket + upset points</span>
                              </label>
                            </div>
                          )}

                          {((goody.key !== "first_conference_out" && goody.key !== "dark_horse_champion") ||
                            scoringModeByGoodyId.get(goody.id) === "fixed" ||
                            scoringModeByGoodyId.get(goody.id) === undefined) && (
                            <div className="flex items-center gap-3 min-w-0">
                              <label
                                htmlFor={`goody_points_${goody.id}`}
                                className="text-xs text-muted-foreground shrink-0"
                              >
                                Points
                              </label>
                              <input
                                id={`goody_points_${goody.id}`}
                                name={`goody_points_${goody.id}`}
                                type="number"
                                min={0}
                                step={1}
                                defaultValue={goodyPointsMap.get(goody.id) ?? goody.default_points}
                                className="input-field w-20 py-2 text-center shrink-0"
                              />
                            </div>
                          )}

                          {goody.key === "first_conference_out" && (scoringModeByGoodyId.get(goody.id) ?? "fixed") === "conference_multiplier" && (
                            <input type="hidden" name={`goody_points_${goody.id}`} value="0" />
                          )}
                          {goody.key === "dark_horse_champion" && (scoringModeByGoodyId.get(goody.id) ?? "fixed") === "bracket_upset_points" && (
                            <input type="hidden" name={`goody_points_${goody.id}`} value="0" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}
