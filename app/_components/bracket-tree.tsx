"use client";

import { useState, useCallback, useEffect } from "react";
import { Team, TournamentGame, REGIONS, FINAL_FOUR_MATCHUPS, BracketStructure, getBracketStructure } from "@/lib/types";
import { getDownstreamGameIds } from "@/lib/bracket-utils";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import BracketRegion from "./bracket-region";
import BracketFinalFour from "./bracket-final-four";
import BracketMobile from "./bracket-mobile";

const DRAFT_STORAGE_KEY_PREFIX = "brackie:draft:";

function getDraftKey(bracketId: string): string {
  return `${DRAFT_STORAGE_KEY_PREFIX}${bracketId}`;
}

export function clearBracketDraft(bracketId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getDraftKey(bracketId));
  } catch {
    // ignore
  }
}

interface Props {
  teams: Team[];
  games: TournamentGame[];
  /** When provided, overrides default East/West/South/Midwest layout and Final Four matchups */
  bracketStructure?: BracketStructure | null;
  initialPicks?: Record<string, string>;
  /** When set, draft picks are persisted to localStorage so they survive navigation */
  bracketId?: string;
  readOnly?: boolean;
  onSave?: (picks: Record<string, string>) => void;
  saving?: boolean;
  saveLabel?: string;
}

function loadDraftPicks(bracketId: string, games: TournamentGame[], fallback: Record<string, string>): Record<string, string> {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(getDraftKey(bracketId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return fallback;
    const gameIds = new Set(games.map((g) => g.id));
    const out: Record<string, string> = {};
    for (const [gameId, teamId] of Object.entries(parsed)) {
      if (typeof gameId === "string" && typeof teamId === "string" && gameIds.has(gameId)) {
        out[gameId] = teamId;
      }
    }
    return Object.keys(out).length > 0 ? out : fallback;
  } catch {
    return fallback;
  }
}

export default function BracketTree({
  teams,
  games,
  bracketStructure: bracketStructureProp,
  initialPicks = {},
  bracketId,
  readOnly = false,
  onSave,
  saving = false,
  saveLabel,
}: Props) {
  const isMobile = useIsMobile();
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    bracketId && !readOnly ? loadDraftPicks(bracketId, games, initialPicks) : initialPicks
  );
  const structure = bracketStructureProp ?? getBracketStructure(null);
  const { regionsInOrder, finalFourMatchups } = structure;

  // Persist draft to localStorage when editing and bracketId is set
  useEffect(() => {
    if (!bracketId || readOnly || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(getDraftKey(bracketId), JSON.stringify(picks));
    } catch {
      // ignore
    }
  }, [bracketId, readOnly, picks]);

  const handlePick = useCallback(
    (gameId: string, teamId: string) => {
      if (readOnly) return;

      setPicks((prev) => {
        const next = { ...prev };

        if (next[gameId] === teamId) return prev;

        const oldPick = next[gameId];
        next[gameId] = teamId;

        if (oldPick && oldPick !== teamId) {
          const downstreamIds = getDownstreamGameIds(gameId, games, finalFourMatchups);
          for (const dsId of downstreamIds) {
            if (next[dsId] === oldPick) {
              delete next[dsId];
            }
          }
        }

        return next;
      });
    },
    [readOnly, games, finalFourMatchups]
  );

  const randomFillBracket = useCallback(() => {
    if (readOnly || Object.keys(picks).length > 0) return;

    const teamMap = new Map<string, Team>();
    for (const t of teams) teamMap.set(t.id, t);

    const newPicks: Record<string, string> = {};
    const gamesByRound = new Map<number, TournamentGame[]>();
    for (const g of games) {
      const list = gamesByRound.get(g.round) ?? [];
      list.push(g);
      gamesByRound.set(g.round, list);
    }

    for (let round = 1; round <= 6; round++) {
      const roundGames = gamesByRound.get(round) ?? [];
      for (const game of roundGames) {
        let t1Id: string | null = null;
        let t2Id: string | null = null;

        if (round === 1) {
          t1Id = game.team1_id;
          t2Id = game.team2_id;
        } else if (round <= 4 && game.region) {
          const prevGames = gamesByRound.get(round - 1) ?? [];
          const feeder1 = prevGames.find(
            (g) => g.region === game.region && g.position === game.position * 2
          );
          const feeder2 = prevGames.find(
            (g) => g.region === game.region && g.position === game.position * 2 + 1
          );
          t1Id = feeder1 ? newPicks[feeder1.id] ?? null : null;
          t2Id = feeder2 ? newPicks[feeder2.id] ?? null : null;
        } else if (round === 5) {
          const [regionA, regionB] = finalFourMatchups[game.position] ?? [null, null];
          const e8A = (gamesByRound.get(4) ?? []).find((g) => g.region === regionA);
          const e8B = (gamesByRound.get(4) ?? []).find((g) => g.region === regionB);
          t1Id = e8A ? newPicks[e8A.id] ?? null : null;
          t2Id = e8B ? newPicks[e8B.id] ?? null : null;
        } else if (round === 6) {
          const ffGames = (gamesByRound.get(5) ?? []).sort((a, b) => a.position - b.position);
          t1Id = ffGames[0] ? newPicks[ffGames[0].id] ?? null : null;
          t2Id = ffGames[1] ? newPicks[ffGames[1].id] ?? null : null;
        }

        if (t1Id && t2Id) {
          newPicks[game.id] = Math.random() < 0.5 ? t1Id : t2Id;
        } else if (t1Id) {
          newPicks[game.id] = t1Id;
        } else if (t2Id) {
          newPicks[game.id] = t2Id;
        }
      }
    }

    setPicks(newPicks);
  }, [readOnly, picks, teams, games, finalFourMatchups]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        randomFillBracket();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [randomFillBracket]);

  const pickCount = Object.keys(picks).length;

  const statusBar = (
    <div className="flex items-center justify-center px-2">
      <div className="text-muted-foreground text-base">
        <span className="font-mono">{pickCount}</span>/63 picks
        {pickCount === 63 && (
          <span className="ml-2 text-green-400 font-medium">
            Complete!
          </span>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <BracketMobile
          teams={teams}
          games={games}
          bracketStructure={structure}
          picks={picks}
          onPick={handlePick}
          readOnly={readOnly}
        />
        {pickCount === 63 && onSave && !readOnly && (
          <div className="flex justify-center">
            <button
              onClick={() => onSave(picks)}
              disabled={saving}
              className="rounded-lg py-2.5 px-6 text-base font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? "Saving…" : saveLabel ?? "Save Bracket"}
            </button>
          </div>
        )}
        {statusBar}
      </div>
    );
  }

  const regionGames = (region: string) =>
    games.filter((g) => g.region === region);
  const regionTeams = (region: string) =>
    teams.filter((t) => t.region === region);
  const finalGames = games.filter((g) => g.round >= 5);

  const [leftTop, rightTop, leftBottom, rightBottom] = regionsInOrder;

  return (
    <div className="flex flex-col gap-4">
      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex flex-col gap-4 w-full min-w-fit">
          {/* Top half: leftTop + rightTop */}
          <div className="flex justify-between">
            <div className="shrink-0">
              <div className="text-[12px] uppercase tracking-widest text-center mb-1.5 font-semibold text-accent">
                {leftTop}
              </div>
              <BracketRegion
                region={leftTop}
                games={regionGames(leftTop)}
                teams={regionTeams(leftTop)}
                picks={picks}
                onPick={handlePick}
                direction="ltr"
                readOnly={readOnly}
              />
            </div>

            <div className="shrink-0">
              <div className="text-[12px] uppercase tracking-widest text-center mb-1.5 font-semibold text-accent">
                {rightTop}
              </div>
              <BracketRegion
                region={rightTop}
                games={regionGames(rightTop)}
                teams={regionTeams(rightTop)}
                picks={picks}
                onPick={handlePick}
                direction="rtl"
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Center: Final Four + Championship + Save */}
          <div className="flex flex-col items-center gap-4">
            <BracketFinalFour
              games={finalGames}
              allGames={games}
              teams={teams}
              finalFourMatchups={finalFourMatchups}
              picks={picks}
              onPick={handlePick}
              readOnly={readOnly}
            />
            {pickCount === 63 && onSave && !readOnly && (
              <button
                onClick={() => onSave(picks)}
                disabled={saving}
                className="rounded-lg py-2.5 px-6 text-base font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? "Saving…" : saveLabel ?? "Save Bracket"}
              </button>
            )}
          </div>

          {/* Bottom half: leftBottom + rightBottom */}
          <div className="flex justify-between">
            <div className="shrink-0">
              <div className="text-[12px] uppercase tracking-widest text-center mb-1.5 font-semibold text-accent">
                {leftBottom}
              </div>
              <BracketRegion
                region={leftBottom}
                games={regionGames(leftBottom)}
                teams={regionTeams(leftBottom)}
                picks={picks}
                onPick={handlePick}
                direction="ltr"
                readOnly={readOnly}
              />
            </div>

            <div className="shrink-0">
              <div className="text-[12px] uppercase tracking-widest text-center mb-1.5 font-semibold text-accent">
                {rightBottom}
              </div>
              <BracketRegion
                region={rightBottom}
                games={regionGames(rightBottom)}
                teams={regionTeams(rightBottom)}
                picks={picks}
                onPick={handlePick}
                direction="rtl"
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {statusBar}
    </div>
  );
}
