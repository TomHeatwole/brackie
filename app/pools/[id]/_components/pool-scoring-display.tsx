import { ROUND_NAMES, type PoolWithDetails } from "@/lib/types";
import type { PoolGoodyWithType } from "@/lib/pools";

const ROUND_KEYS = ["1", "2", "3", "4", "5", "6"] as const;

interface PoolScoringDisplayProps {
  pool: PoolWithDetails;
  poolGoodiesWithTypes: PoolGoodyWithType[];
}

export default function PoolScoringDisplay({
  pool,
  poolGoodiesWithTypes,
}: PoolScoringDisplayProps) {
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
        <div className="flex items-center gap-3 mb-5">
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

        <div className="space-y-6">
          {/* Round points — grid of round chips */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Points per correct pick
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ROUND_KEYS.map((key) => {
                const pts = pool.round_points?.[key] ?? 0;
                const label = ROUND_NAMES[Number(key)];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-card-border bg-stone-900/50 px-3 py-2.5 shadow-sm"
                  >
                    <span className="text-xs text-stone-400 truncate pr-2">
                      {label}
                    </span>
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
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Upset bonus
            </p>
            {pool.upset_points_enabled ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {ROUND_KEYS.map((key) => {
                  const mult = pool.upset_multipliers?.[key] ?? 1;
                  const label = ROUND_NAMES[Number(key)];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-card-border bg-stone-900/50 px-3 py-2.5 shadow-sm"
                    >
                      <span className="text-xs text-stone-400 truncate pr-2">
                        {label}
                      </span>
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
              <p className="text-[11px] font-semibold uppercase tracking-widest text-accent mb-3">
                Goodies
              </p>
              <ul className="space-y-2">
                {poolGoodiesWithTypes.map((pg) => (
                  <li
                    key={pg.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2.5 ring-1 ring-stone-800/50"
                  >
                    <span className="text-sm text-stone-200">
                      {pg.goody_types?.name ?? "Goody"}
                      {pg.stroke_rule_enabled && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (stroke rule)
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-md bg-accent/25 px-2.5 py-1 text-sm font-bold tabular-nums text-accent ring-1 ring-accent/20">
                      +{pg.points} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
