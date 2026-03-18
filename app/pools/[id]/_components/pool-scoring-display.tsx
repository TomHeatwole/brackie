"use client";

import { useState } from "react";
import { type PoolWithDetails } from "@/lib/types";
import type { PoolGoodyWithType } from "@/lib/pools";
import ScoringTooltip from "@/app/_components/scoring-tooltip";

const ROUND_KEYS = ["1", "2", "3", "4", "5", "6"] as const;
const ROUND_LABELS: Record<string, string> = {
  "1": "R64",
  "2": "R32",
  "3": "S16",
  "4": "E8",
  "5": "F4",
  "6": "Champ",
};
const ROUND_LABELS_FULL: Record<string, string> = {
  "1": "Round of 64",
  "2": "Round of 32",
  "3": "Sweet 16",
  "4": "Elite 8",
  "5": "Final Four",
  "6": "Championship",
};

interface PoolScoringDisplayProps {
  pool: PoolWithDetails;
  poolGoodiesWithTypes: PoolGoodyWithType[];
}

export default function PoolScoringDisplay({
  pool,
  poolGoodiesWithTypes,
}: PoolScoringDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const hasGoodies = pool.goodies_enabled && poolGoodiesWithTypes.length > 0;

  return (
    <div
      className={`relative mb-8 overflow-hidden rounded-xl border shadow-md ${
        hasGoodies
          ? "border-accent/35 bg-gradient-to-br from-accent/8 via-accent/3 to-transparent"
          : "border-card-border bg-card"
      } ${!hasGoodies ? "border-l-4 border-l-accent/50" : ""}`}
    >
      {hasGoodies && (
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-accent/60 to-accent/20" aria-hidden />
      )}
      <div className="relative px-5 py-5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-between gap-3 rounded-lg text-left mb-0 -mx-1 px-1 py-0.5 hover:bg-white/5 transition-colors"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-3">
            {hasGoodies && (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/25 text-accent shadow-inner"
                aria-hidden
              >
                ★
              </span>
            )}
            <h2 className="text-lg font-semibold tracking-tight text-stone-100">
              Scoring
            </h2>
          </div>
          <span
            className={`shrink-0 text-stone-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {expanded && (
        <div className="space-y-6 mt-5">
          {/* Round points — grid of round chips */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Points per correct pick
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ROUND_KEYS.map((key) => {
                const pts = pool.round_points?.[key] ?? 0;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-card-border bg-stone-900/50 px-2.5 py-2 shadow-sm"
                  >
                    <span className="text-[11px] text-stone-400 sm:hidden">{ROUND_LABELS[key]}</span>
                    <span className="text-xs text-stone-400 hidden sm:inline">{ROUND_LABELS_FULL[key]}</span>
                    <span className="shrink-0 flex items-baseline gap-0.5">
                      <span className="text-sm font-bold tabular-nums text-stone-200">
                        {pts}
                      </span>
                      <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wide">
                        pts
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upset bonus — same grid as points per round */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Upset bonus
              </p>
              <div className="flex items-center gap-2">
                <ScoringTooltip
                  content={
                    <>
                      Upset bonus = Upset multiplier × seed differential. Seed differential is the winning seed minus the seed that would be there if the bracket went all chalk.
                    </>
                  }
                />
                <a
                  href="/rules"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent hover:underline"
                >
                  How Upset points work
                </a>
              </div>
            </div>
            {pool.upset_points_enabled ? (
              <div className="grid grid-cols-3 gap-2">
                {ROUND_KEYS.map((key) => {
                  const mult = pool.upset_multipliers?.[key] ?? 1;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-card-border bg-stone-900/50 px-2.5 py-2 shadow-sm"
                    >
                      <span className="text-[11px] text-stone-400 sm:hidden">{ROUND_LABELS[key]}</span>
                      <span className="text-xs text-stone-400 hidden sm:inline">{ROUND_LABELS_FULL[key]}</span>
                      <span className="shrink-0 flex items-baseline gap-0.5">
                        <span className="text-sm font-bold tabular-nums text-stone-200">
                          ×{mult}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-stone-800/80 px-2.5 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-700/50">
                Off
              </span>
            )}
          </div>

          {/* Goodies — standout block when present */}
          {hasGoodies && (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3.5 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                  Goodies
                </p>
                <div className="flex items-center gap-2">
                  <ScoringTooltip
                    variant="goodies"
                    content="Goodies are optional bonus categories that can award extra points on top of your normal bracket score."
                  />
                  <a
                    href="/rules#goodies"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-accent/90 hover:underline"
                  >
                    How Goodies work
                  </a>
                </div>
              </div>
              <ul className="space-y-2">
                {poolGoodiesWithTypes.map((pg) => {
                  const mode = pg.scoring_mode ?? "fixed";
                  const isConferenceMultiplier = mode === "conference_multiplier";
                  const isBracketUpset = mode === "bracket_upset_points";
                  const champBase = pool.round_points?.["6"] ?? 130;
                  const champUpsetMult = pool.upset_multipliers?.["6"] ?? 20;
                  const regularChampFormula = pool.upset_points_enabled
                    ? `${champBase} + (${champUpsetMult} × upset)`
                    : String(champBase);
                  const pointsLabel =
                    isConferenceMultiplier && pg.scoring_config?.conference_multiplier != null
                      ? `Conference size × ${pg.scoring_config.conference_multiplier} pts`
                      : isBracketUpset
                        ? regularChampFormula
                        : `${pg.points} pts`;
                  return (
                    <li
                      key={pg.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2.5 ring-1 ring-stone-800/50"
                    >
                      <span className="text-sm text-stone-200">
                        {pg.goody_types?.name ?? "Goodie"}
                        {pg.stroke_rule_enabled && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (stroke rule)
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-md bg-accent/25 px-2.5 py-1 text-sm font-bold tabular-nums text-accent ring-1 ring-accent/20">
                        {pointsLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
