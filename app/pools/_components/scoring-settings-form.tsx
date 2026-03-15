"use client";

import { useState } from "react";
import {
  ROUND_NAMES,
  RoundPoints,
  UpsetMultipliers,
  GoodyType,
  PoolGoody,
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

  const [selectedGoodies, setSelectedGoodies] = useState<Set<string>>(enabledGoodyIds);

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
        <div className="flex items-center justify-between mb-3">
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
        {goodiesEnabled && (
          <div className="flex flex-col gap-2">
            {goodyTypes.length === 0 && (
              <p className="text-xs text-muted">No goodies available yet.</p>
            )}
            {goodyTypes.map((goody) => {
              const isSelected = selectedGoodies.has(goody.id);
              return (
                <div
                  key={goody.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-accent bg-card"
                      : "border-card-border bg-background hover:border-card-border-hover"
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
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-stone-200">{goody.name}</span>
                    {goody.description && (
                      <p className="text-xs text-muted mt-0.5">{goody.description}</p>
                    )}
                  </div>
                  {isSelected && (
                    <div
                      className="flex items-center gap-3 shrink-0 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          name={`goody_stroke_rule_${goody.id}`}
                          value="true"
                          defaultChecked={goodyStrokeRuleMap.get(goody.id) ?? false}
                          className="rounded border-card-border"
                        />
                        <span className="text-xs text-muted-foreground">Stroke rule</span>
                      </label>
                      <label
                        htmlFor={`goody_points_${goody.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Pts
                      </label>
                      <input
                        id={`goody_points_${goody.id}`}
                        name={`goody_points_${goody.id}`}
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={goodyPointsMap.get(goody.id) ?? goody.default_points}
                        className="input-field w-16 text-center"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}
