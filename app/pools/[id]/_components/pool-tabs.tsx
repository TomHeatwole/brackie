"use client";

import { useState, useCallback, useRef, useEffect, useTransition } from "react";
import type { ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { PoolWithDetails, PoolMemberWithInfo, Team, TournamentGame, HallOfFameEntry, BracketStructure } from "@/lib/types";
import type { PoolGoodyWithType } from "@/lib/pools";
import type { BracketScoreSummary, RoundGameEvaluation, GoodyScoreEntry } from "@/lib/scoring";
import { LOWEST_SEED_GOODY_ROUNDS, getBracketDerivedGoodyAnswer } from "@/lib/scoring";
import PoolScoringDisplay from "./pool-scoring-display";
import PicksTable from "./picks-table";
import PicksBracketView from "./picks-bracket-view";
import UserAvatar from "@/app/_components/user-avatar";
import { formatUserDisplayName } from "@/utils/display-name";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

type TabKey = "scoring" | "scores" | "picks" | "goodies" | "hall-of-fame";

const ROUND_LABELS: Record<number, string> = {
  1: "Rd. 64",
  2: "Rd. 32",
  3: "S16",
  4: "E8",
  5: "F4",
  6: "Champion",
};

const ROUND_HOVER_LABELS: Record<number, string> = {
  1: "Rd. 64",
  2: "Rd. 32",
  3: "Sweet16",
  4: "Elite8",
  5: "Final4",
  6: "Champion",
};

interface BracketPickEntry {
  bracketId: string;
  userId: string;
  picks: { game_id: string; picked_team_id: string }[];
}

interface PoolTabsProps {
  pool: PoolWithDetails;
  poolId: string;
  members: PoolMemberWithInfo[];
  poolGoodiesWithTypes: PoolGoodyWithType[];
  teams?: Team[];
  games?: TournamentGame[];
  bracketPicks?: BracketPickEntry[];
  isCreator: boolean;
  modeParam: string;
  scores?: BracketScoreSummary[];
  goodyAnswers?: {
    userId: string;
    goodyTypeId: string;
    value: Record<string, unknown> | null;
  }[];
  goodyResults?: {
    goody_type_id: string;
    value: Record<string, unknown>;
  }[];
  hallOfFame?: HallOfFameEntry[];
  currentUserId?: string;
  bracketStructure?: BracketStructure;
}

export default function PoolTabs({
  pool,
  poolId,
  members,
  poolGoodiesWithTypes,
  teams = [],
  games = [],
  bracketPicks = [],
  isCreator,
  modeParam,
  scores = [],
  goodyAnswers = [],
  goodyResults = [],
  hallOfFame = [],
  currentUserId,
  bracketStructure,
}: PoolTabsProps) {
  const hasGoodies = pool.goodies_enabled && poolGoodiesWithTypes.length > 0;
  const hasHallOfFame = hallOfFame.length > 0;
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const gameById = new Map(games.map((g) => [g.id, g]));
  const totalPoolGoodyPoints = poolGoodiesWithTypes.reduce((sum, pg) => sum + (pg.points ?? 0), 0);
  const goodyResultByType = new Map(goodyResults.map((r) => [r.goody_type_id, r]));

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const validTabs: TabKey[] = ["scoring", "scores", "picks", "goodies", "hall-of-fame"];
  const tabParam = searchParams.get("tab");
  const urlTab: TabKey =
    tabParam && validTabs.includes(tabParam as TabKey) ? (tabParam as TabKey) : "scores";

  const [activeTab, setActiveTabState] = useState<TabKey>(urlTab);
  const [picksView, setPicksView] = useState<"table" | "bracket">("table");
  const [expandedGoodies, setExpandedGoodies] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [mobileScorePopup, setMobileScorePopup] = useState<{type: 'goody' | 'possible', bracketId: string} | null>(null);

  useEffect(() => {
    setActiveTabState(urlTab);
  }, [urlTab]);

  const setActiveTab = useCallback(
    (tab: TabKey) => {
      setActiveTabState(tab);
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "scores") {
          params.delete("tab");
        } else {
          params.set("tab", tab);
        }
        const qs = params.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [searchParams, router, pathname, startTransition]
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "scoring", label: "Scoring" },
    { key: "scores", label: "Scores" },
    { key: "picks", label: "Picks" },
    { key: "goodies", label: "Goodies" },
    ...(hasHallOfFame ? [{ key: "hall-of-fame" as TabKey, label: "Hall of Fame" }] : []),
  ];

  function formatGoodyAnswerValue(
    pg: PoolGoodyWithType,
    rawValue: Record<string, unknown> | null
  ): string {
    if (!rawValue) return "—";
    const value = rawValue as {
      conference_key?: unknown;
      nit_matchup?: unknown;
      team_id?: unknown;
      game_id?: unknown;
    };

    if (value.conference_key) {
      return String(value.conference_key);
    }
    if (value.nit_matchup) {
      return String(value.nit_matchup);
    }
    if (value.team_id) {
      const t = teamById.get(String(value.team_id));
      return t ? `${t.name} (${t.seed})` : `Team ${String(value.team_id)}`;
    }
    if (value.game_id) {
      const g = gameById.get(String(value.game_id));
      if (g) {
        const t1 = g.team1_id ? teamById.get(g.team1_id) : null;
        const t2 = g.team2_id ? teamById.get(g.team2_id) : null;
        if (t1 && t2) return `${t1.name} (${t1.seed}) vs ${t2.name} (${t2.seed})`;
      }
      return `Game ${String(value.game_id)}`;
    }

    return "—";
  }

  function getTeamLabel(teamId: string) {
    const t = teamById.get(teamId);
    if (!t) return `Team ${teamId}`;
    return `${t.name} (${t.seed})`;
  }

  function PossiblePointsTooltip({
    bracketPossible,
    goodies,
    perGoody,
    children,
  }: {
    bracketPossible: number;
    goodies: PoolGoodyWithType[];
    perGoody?: Record<string, GoodyScoreEntry>;
    children: ReactNode;
  }) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);

    const aliveGoodies = goodies.filter((pg) => {
      const entry = perGoody?.[pg.goody_type_id];
      return entry?.status === "alive" || entry?.status === "pending";
    });
    const goodyTotal = aliveGoodies.reduce((sum, pg) => {
      const entry = perGoody?.[pg.goody_type_id];
      return sum + (entry?.possiblePoints ?? pg.points ?? 0);
    }, 0);

    return (
      <div
        className="relative inline-flex"
        onMouseEnter={() => { if (!isMobile) setOpen(true); }}
        onMouseLeave={() => { if (!isMobile) setOpen(false); }}
        onClick={() => { if (isMobile) setOpen((o) => !o); }}
      >
        {children}
        <div
          className={`absolute z-50 right-0 bottom-full mb-1 w-64 rounded-md border px-3 py-2.5 text-[11px] shadow-lg backdrop-blur-sm border-accent/25 bg-stone-950/95 text-stone-200 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          } transition`}
          style={{ boxShadow: "0 0 12px rgba(194, 85, 10, 0.08)" }}
        >
          <div className="font-semibold mb-2 text-accent text-left">Possible Points Remaining</div>
          <table className="w-full text-left">
            <tbody>
              <tr>
                <td className="py-0.5 text-stone-400">Bracket</td>
                <td className="py-0.5 text-right tabular-nums text-stone-200">{bracketPossible} pts</td>
              </tr>
              <tr>
                <td className="py-0.5 text-stone-400">Goodies</td>
                <td className="py-0.5 text-right tabular-nums text-stone-200">{goodyTotal} pts</td>
              </tr>
            </tbody>
          </table>
          {aliveGoodies.length > 0 && (
            <div className="mt-1.5 pl-2 border-l border-accent/30">
              {aliveGoodies.map((pg) => {
                const entry = perGoody?.[pg.goody_type_id];
                const pts = entry?.possiblePoints ?? pg.points ?? 0;
                return (
                  <div key={pg.id} className="py-0.5 flex justify-between gap-2">
                    <span className="text-stone-500 truncate">{pg.goody_types?.name ?? "Goodie"}</span>
                    <span className="tabular-nums text-stone-400 shrink-0">{pts} pts</span>
                  </div>
                );
              })}
            </div>
          )}
          <table className="w-full text-left mt-1.5">
            <tbody>
              <tr className="border-t border-accent/20">
                <td className="pt-1.5 font-semibold text-stone-200">Total</td>
                <td className="pt-1.5 text-right tabular-nums font-semibold text-stone-200">{bracketPossible + goodyTotal} pts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function RoundPointsTooltip({
    round,
    evaluatedGames,
    children,
  }: {
    round: number;
    evaluatedGames: RoundGameEvaluation[];
    children: ReactNode;
  }) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [showAbove, setShowAbove] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    const correct = evaluatedGames.filter((g) => g.status === "correct");
    const incorrect = evaluatedGames.filter((g) => g.status === "wrong" || g.status === "dead");

    const sortedCorrect = [...correct].sort((a, b) => b.pointsAwarded - a.pointsAwarded);
    const sortedIncorrect = [...incorrect].sort(
      (a, b) => (b.pointsIfCorrect ?? 0) - (a.pointsIfCorrect ?? 0)
    );

    function handleOpen() {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setShowAbove(spaceBelow < 280);
      }
      setOpen(true);
    }

    return (
      <div
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={() => { if (!isMobile) handleOpen(); }}
        onMouseLeave={() => { if (!isMobile) setOpen(false); }}
        onClick={() => { if (isMobile) { if (open) setOpen(false); else handleOpen(); } }}
      >
        {children}

        <div
          className={`absolute z-50 left-1/2 -translate-x-1/2 w-72 rounded-md border px-3 py-2 text-[11px] shadow-lg backdrop-blur-sm border-card-border bg-stone-950/95 text-stone-200 ${
            showAbove ? "bottom-full mb-1" : "top-full mt-1"
          } ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          } transition`}
        >
          <div className="font-semibold mb-2">{ROUND_HOVER_LABELS[round]} picks</div>

          <div className="max-h-52 overflow-y-auto scrollbar-custom-y">
            {sortedCorrect.length > 0 ? (
              <div className="mb-2">
                <div className="font-semibold text-stone-100">Correct</div>
                <div className="mt-1 space-y-1">
                  {sortedCorrect.map((g) => (
                    <div key={g.gameId} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate text-emerald-300">
                        {g.pickedTeamId ? getTeamLabel(g.pickedTeamId) : "Unpicked"}
                      </span>
                      <span className="tabular-nums text-emerald-200">{g.pointsAwarded} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {sortedIncorrect.length > 0 ? (
              <div>
                <div className="font-semibold text-stone-100">Incorrect</div>
                <div className="mt-1 space-y-1">
                  {sortedIncorrect.map((g) => (
                    <div key={g.gameId} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate text-red-300">
                        {g.pickedTeamId ? getTeamLabel(g.pickedTeamId) : "Unpicked"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {sortedCorrect.length === 0 && sortedIncorrect.length === 0 ? (
              <div className="text-stone-500">No picks evaluated yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  function GoodyProgressTooltip({
    score,
    children,
  }: {
    score: BracketScoreSummary;
    children: ReactNode;
  }) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [showAbove, setShowAbove] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    function handleOpen() {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setShowAbove(spaceBelow < 280);
      }
      setOpen(true);
    }

    const correct: { pg: PoolGoodyWithType; entry: GoodyScoreEntry }[] = [];
    const missed: { pg: PoolGoodyWithType }[] = [];

    for (const pg of poolGoodiesWithTypes) {
      const entry = score.perGoody?.[pg.goody_type_id];

      if (entry && (entry.status === "won" || entry.status === "stroke")) {
        correct.push({ pg, entry });
      } else if (entry && (entry.status === "eliminated" || entry.status === "not_awarded")) {
        missed.push({ pg });
      }
    }

    return (
      <div
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={() => {
          if (!isMobile) handleOpen();
        }}
        onMouseLeave={() => {
          if (!isMobile) setOpen(false);
        }}
        onClick={() => {
          if (isMobile) {
            if (open) setOpen(false);
            else handleOpen();
          }
        }}
      >
        {children}

        <div
          className={`absolute z-50 right-0 w-72 rounded-md border px-3 py-2 text-[11px] shadow-lg backdrop-blur-sm border-card-border bg-stone-950/95 text-stone-200 ${
            showAbove ? "bottom-full mb-1" : "top-full mt-1"
          } ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          } transition`}
        >
          <div className="font-semibold mb-2">Goodies</div>

          <div>
            {correct.length > 0 && (
              <div className="mb-2">
                <div className="font-semibold text-stone-100">Correct</div>
                <div className="mt-1 space-y-1">
                  {correct.map(({ pg, entry }) => (
                    <div key={pg.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate text-emerald-300">
                        {pg.goody_types?.name ?? "Goodie"}
                      </span>
                      <span className="tabular-nums shrink-0 text-emerald-200">
                        +{entry.pointsAwarded} pts{entry.status === "stroke" ? " (stroke)" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missed.length > 0 && (
              <div>
                <div className="font-semibold text-stone-100">Missed</div>
                <div className="mt-1 space-y-1">
                  {missed.map(({ pg }) => (
                    <div key={pg.id} className="text-red-400/80 truncate">
                      {pg.goody_types?.name ?? "Goodie"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {poolGoodiesWithTypes.length === 0 && (
              <div className="text-stone-500">No goodies configured.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      <aside>
        <div className="rounded-lg border border-card-border bg-card/80 py-2 h-full">
          <div className="flex flex-col gap-1 text-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-md text-left transition-colors ${
                  activeTab === tab.key
                    ? "bg-accent text-stone-950"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="border border-card-border rounded-lg bg-card/60">
          <div className="bg-background/80">
            {activeTab === "scoring" && (
              <div className="px-4 py-4">
                <PoolScoringDisplay pool={pool} poolGoodiesWithTypes={poolGoodiesWithTypes} />
              </div>
            )}

            {activeTab === "scores" && (
              <div className="px-3 py-3">
                {scores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Scores will appear here once brackets have been submitted and games are completed.
                  </p>
                ) : isMobile ? (
                  <>
                  <div className="overflow-x-auto rounded-md border border-card-border">
                    <table className="w-full border-collapse text-[9px]">
                      <thead>
                        <tr className="bg-stone-900">
                          <th className="sticky left-0 z-10 bg-stone-900 px-1.5 py-1 text-left font-medium text-stone-500 border-b border-r border-card-border whitespace-nowrap">Player</th>
                          <th className="px-1 py-1 text-center font-semibold text-accent border-b border-card-border whitespace-nowrap">Tot</th>
                          {[1,2,3,4,5,6].map(r => (
                            <th key={r} className="px-1 py-1 text-center font-medium text-stone-500 border-b border-card-border whitespace-nowrap">
                              {["R64","R32","S16","E8","F4","Ch"][r-1]}
                            </th>
                          ))}
                          {hasGoodies && <th className="px-1 py-1 text-center font-medium text-emerald-500/70 border-b border-card-border whitespace-nowrap">G</th>}
                          <th className="px-1 py-1 text-center font-medium text-stone-600 border-b border-card-border whitespace-nowrap">Poss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...scores].sort((a, b) => {
                          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                          return b.possiblePoints - a.possiblePoints;
                        }).map((score, index) => {
                          const member = members.find((m) => m.user_id === score.userId);
                          if (!member) return null;
                          const name = formatUserDisplayName(member.first_name, member.last_name) || "Anonymous";
                          const isCurrentUser = score.userId === currentUserId;
                          return (
                            <tr key={score.bracketId} className={`border-b border-card-border last:border-b-0 ${isCurrentUser ? "bg-accent/[0.03]" : ""}`}>
                              <td className={`sticky left-0 z-10 px-1.5 py-1 border-r border-card-border whitespace-nowrap ${isCurrentUser ? "" : "bg-card"}`}>
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-500 tabular-nums w-3 shrink-0 text-right">{index + 1}</span>
                                  <span className={`truncate max-w-[65px] ${isCurrentUser ? "text-accent font-medium" : "text-stone-200"}`}>{name}</span>
                                </div>
                              </td>
                              <td className="px-1 py-1 text-center tabular-nums font-bold text-accent">{score.totalPoints}</td>
                              {[1,2,3,4,5,6].map(r => (
                                <td key={r} className="px-1 py-1 text-center tabular-nums text-stone-300">{score.perRound[r]?.totalPoints ?? 0}</td>
                              ))}
                              {hasGoodies && (
                                <td
                                  className={`px-1 py-1 text-center tabular-nums font-medium cursor-pointer ${(score.totalGoodyPoints ?? 0) > 0 ? "text-emerald-300" : "text-stone-400"}`}
                                  onClick={() => setMobileScorePopup({ type: 'goody', bracketId: score.bracketId })}
                                >
                                  {score.totalGoodyPoints ?? 0}
                                </td>
                              )}
                              <td
                                className="px-1 py-1 text-center tabular-nums text-stone-500 cursor-pointer"
                                onClick={() => setMobileScorePopup({ type: 'possible', bracketId: score.bracketId })}
                              >
                                {score.possibleBracketPoints + (score.possibleGoodyPoints ?? 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {mobileScorePopup && (() => {
                    const popupScore = scores.find(s => s.bracketId === mobileScorePopup.bracketId);
                    if (!popupScore) return null;
                    const popupMember = members.find(m => m.user_id === popupScore.userId);
                    const popupName = popupMember
                      ? formatUserDisplayName(popupMember.first_name, popupMember.last_name) || "Anonymous"
                      : "Unknown";

                    if (mobileScorePopup.type === 'goody') {
                      const correct: { name: string; pts: number; stroke: boolean }[] = [];
                      const missed: string[] = [];
                      for (const pg of poolGoodiesWithTypes) {
                        const entry = popupScore.perGoody?.[pg.goody_type_id];
                        const goodyName = pg.goody_types?.name ?? "Goodie";
                        if (entry && (entry.status === "won" || entry.status === "stroke")) {
                          correct.push({ name: goodyName, pts: entry.pointsAwarded, stroke: entry.status === "stroke" });
                        } else if (entry && (entry.status === "eliminated" || entry.status === "not_awarded")) {
                          missed.push(goodyName);
                        }
                      }
                      return (
                        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setMobileScorePopup(null)}>
                          <div className="absolute inset-0 bg-black/40" />
                          <div className="relative w-full max-w-sm rounded-t-xl border-t border-x border-card-border bg-stone-950 px-4 pt-4 pb-6 text-xs shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="font-semibold text-accent mb-3">{popupName} — Goodies</div>
                            {correct.length > 0 && (
                              <div className="mb-2">
                                <div className="font-semibold text-stone-300 text-[11px] mb-1">Correct</div>
                                {correct.map(c => (
                                  <div key={c.name} className="flex justify-between py-0.5">
                                    <span className="text-emerald-300">{c.name}</span>
                                    <span className="text-emerald-200 tabular-nums">+{c.pts}{c.stroke ? " (stroke)" : ""}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {missed.length > 0 && (
                              <div>
                                <div className="font-semibold text-stone-300 text-[11px] mb-1">Missed</div>
                                {missed.map(n => (
                                  <div key={n} className="text-red-400/80 py-0.5">{n}</div>
                                ))}
                              </div>
                            )}
                            {correct.length === 0 && missed.length === 0 && (
                              <div className="text-stone-500">No goodies concluded yet.</div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const aliveGoodies = poolGoodiesWithTypes.filter(pg => {
                      const entry = popupScore.perGoody?.[pg.goody_type_id];
                      return entry?.status === "alive" || entry?.status === "pending";
                    });
                    const goodyPossible = aliveGoodies.reduce((sum, pg) => {
                      const entry = popupScore.perGoody?.[pg.goody_type_id];
                      return sum + (entry?.possiblePoints ?? pg.points ?? 0);
                    }, 0);
                    return (
                      <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setMobileScorePopup(null)}>
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="relative w-full max-w-sm rounded-t-xl border-t border-x border-card-border bg-stone-950 px-4 pt-4 pb-6 text-xs shadow-xl" onClick={e => e.stopPropagation()}>
                          <div className="font-semibold text-accent mb-3">{popupName} — Possible Points</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-stone-400">Bracket</span>
                              <span className="text-stone-200 tabular-nums">{popupScore.possibleBracketPoints} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400">Goodies</span>
                              <span className="text-stone-200 tabular-nums">{goodyPossible} pts</span>
                            </div>
                            {aliveGoodies.length > 0 && (
                              <div className="ml-3 border-l border-accent/30 pl-2 mt-1">
                                {aliveGoodies.map(pg => {
                                  const entry = popupScore.perGoody?.[pg.goody_type_id];
                                  const pts = entry?.possiblePoints ?? pg.points ?? 0;
                                  return (
                                    <div key={pg.id} className="flex justify-between py-0.5">
                                      <span className="text-stone-500">{pg.goody_types?.name ?? "Goodie"}</span>
                                      <span className="text-stone-400 tabular-nums">{pts} pts</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex justify-between border-t border-accent/20 pt-1.5 mt-1.5">
                              <span className="font-semibold text-stone-200">Total</span>
                              <span className="font-semibold text-stone-200 tabular-nums">{popupScore.possibleBracketPoints + goodyPossible} pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-medium text-stone-200">Scores</h3>
                    </div>
                    <div className="divide-y divide-card-border rounded-md border border-card-border bg-background/60">
                      {[...scores].sort((a, b) => {
                        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                        return b.possiblePoints - a.possiblePoints;
                      }).map((score, index) => {
                        const member = members.find((m) => m.user_id === score.userId);
                        if (!member) return null;
                        const name =
                          formatUserDisplayName(member.first_name, member.last_name) || "Anonymous";
                        const isCurrentUser = score.userId === currentUserId;

                        return (
                          <div
                            key={score.bracketId}
                            className={`px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                              isCurrentUser ? "bg-accent/[0.03] ring-1 ring-inset ring-card-border-hover" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="text-stone-500 font-mono text-sm w-5 shrink-0">
                                {index + 1}
                              </span>
                              <UserAvatar
                                avatarUrl={member.avatar_url}
                                firstName={member.first_name}
                                lastName={member.last_name}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <span className="text-stone-200 text-base font-medium truncate">
                                    {name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0">
                                      You
                                    </span>
                                  )}
                                  {member.user_id === pool.creator_id && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-card-border text-muted-foreground shrink-0">
                                      Creator
                                    </span>
                                  )}
                                </div>
                                {member.bracket_id && (
                                  <a
                                    href={`/brackets/${member.bracket_id}${modeParam ? modeParam + "&" : "?"}pool=${poolId}`}
                                    className="mt-1 block text-sm text-accent hover:underline"
                                  >
                                    {member.bracket_name ?? "Bracket submitted"}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="w-full md:w-auto md:flex-1 md:justify-center overflow-x-auto">
                              <div className="grid grid-cols-7 gap-2 px-0 md:px-4 min-w-[460px] md:min-w-0">
                                <div className="flex flex-col items-center">
                                  <span className="text-[11px] text-stone-500">Total</span>
                                  <span className="text-xl text-accent tabular-nums font-bold">
                                    {score.totalPoints}
                                  </span>
                                </div>
                                {Array.from({ length: 6 }).map((_, i) => {
                                  const r = i + 1;
                                  const roundScore = score.perRound[r];
                                  return (
                                    <div key={r} className="flex flex-col items-center">
                                      <span className="text-[11px] text-stone-500">{ROUND_LABELS[r]}</span>
                                      <RoundPointsTooltip
                                        round={r}
                                        evaluatedGames={roundScore?.evaluatedGames ?? []}
                                      >
                                        <div className="flex flex-col items-center">
                                          <div className="flex items-baseline justify-center">
                                            <span className="text-base text-stone-200 tabular-nums font-semibold">
                                              {roundScore?.totalPoints ?? 0}
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-stone-600">
                                            {roundScore?.gamesCorrect ?? 0}/{roundScore?.gamesPlayed ?? 0}
                                          </span>
                                        </div>
                                      </RoundPointsTooltip>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-right shrink-0">
                              <GoodyProgressTooltip score={score}>
                                <div className="cursor-help">
                                  <span className="text-[11px] text-stone-500 block">Goodies</span>
                                  <span className={`text-base tabular-nums font-semibold ${
                                    (score.totalGoodyPoints ?? 0) > 0 ? "text-emerald-300" : "text-stone-200"
                                  }`}>
                                    {score.totalGoodyPoints ?? 0}
                                  </span>
                                  <span className="text-[11px] text-stone-600 block">
                                    {(() => {
                                      let won = 0;
                                      let concluded = 0;
                                      for (const pg of poolGoodiesWithTypes) {
                                        const entry = score.perGoody?.[pg.goody_type_id];
                                        if (!entry) continue;
                                        if (
                                          entry.status === "won" ||
                                          entry.status === "stroke" ||
                                          entry.status === "eliminated" ||
                                          entry.status === "not_awarded"
                                        ) {
                                          concluded++;
                                          if (entry.status === "won" || entry.status === "stroke")
                                            won++;
                                        }
                                      }
                                      return `${won}/${concluded}`;
                                    })()}
                                  </span>
                                </div>
                              </GoodyProgressTooltip>
                              <PossiblePointsTooltip
                                bracketPossible={score.possibleBracketPoints}
                                goodies={poolGoodiesWithTypes}
                                perGoody={score.perGoody}
                              >
                                <div className="cursor-help">
                                  <span className="text-stone-400 text-base tabular-nums">
                                    {score.possibleBracketPoints + (score.possibleGoodyPoints ?? 0)}
                                  </span>
                                  <span className="text-stone-600 text-sm ml-0.5">possible</span>
                                </div>
                              </PossiblePointsTooltip>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "picks" && (
              <div className="px-3 py-3">
                <div className="flex items-center gap-1 mb-3">
                  <button
                    type="button"
                    onClick={() => setPicksView("table")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      picksView === "table"
                        ? "bg-accent text-white"
                        : "bg-card border border-card-border text-stone-400 hover:text-stone-200 hover:border-card-border-hover"
                    }`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setPicksView("bracket")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      picksView === "bracket"
                        ? "bg-accent text-white"
                        : "bg-card border border-card-border text-stone-400 hover:text-stone-200 hover:border-card-border-hover"
                    }`}
                  >
                    Bracket
                  </button>
                </div>
                {picksView === "table" ? (
                  <PicksTable
                    games={games}
                    teams={teams}
                    members={members}
                    bracketPicks={bracketPicks}
                    scores={scores}
                    poolId={poolId}
                    modeParam={modeParam}
                    poolGoodiesWithTypes={poolGoodiesWithTypes}
                    goodyAnswers={goodyAnswers}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <PicksBracketView
                    games={games}
                    teams={teams}
                    bracketPicks={bracketPicks}
                    bracketStructure={bracketStructure}
                    members={members}
                    scores={scores}
                  />
                )}
              </div>
            )}

            {activeTab === "goodies" && (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                {!hasGoodies ? (
                  <p>This pool doesn&apos;t have any Goodies configured.</p>
                ) : (
                  <div className="space-y-3">
                    {poolGoodiesWithTypes.map((pg) => {
                      const goodyKey = pg.goody_types?.key ?? "";
                      const isBracketDerived = goodyKey in LOWEST_SEED_GOODY_ROUNDS || goodyKey === "best_region_bracket";

                      if (isBracketDerived) {
                        const allEntries: { userId: string; entry: GoodyScoreEntry }[] = [];
                        for (const s of scores) {
                          const entry = s.perGoody?.[pg.goody_type_id];
                          if (entry) allEntries.push({ userId: s.userId, entry });
                        }

                        const hasWinner = allEntries.some((e) => e.entry.status === "won");
                        const hasStroke = allEntries.some((e) => e.entry.status === "stroke");
                        const hasAlive = allEntries.some((e) => e.entry.status === "alive");
                        const allPending = allEntries.every((e) => e.entry.status === "pending");
                        const roundComplete = hasWinner || hasStroke || allEntries.every(
                          (e) => e.entry.status === "won" || e.entry.status === "stroke" || e.entry.status === "not_awarded"
                        );

                        let badgeClass = "border-stone-500/60 bg-stone-500/10 text-stone-400";
                        let badgeText = "Pending";
                        if (roundComplete && (hasWinner || hasStroke)) {
                          badgeClass = "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
                          badgeText = hasStroke ? "Scored (stroke)" : "Scored";
                        } else if (hasAlive && !allPending) {
                          badgeClass = "border-amber-400/60 bg-amber-500/10 text-amber-200";
                          badgeText = "In Progress";
                        }

                        const bracketUserIds = new Set(bracketPicks.map((bp) => bp.userId));
                        const membersWithBrackets = members.filter((m) => bracketUserIds.has(m.user_id));

                        const isLowestSeed = goodyKey in LOWEST_SEED_GOODY_ROUNDS;
                        const isBestRegion = goodyKey === "best_region_bracket";
                        const isInProgress = hasAlive && !allPending && !roundComplete;
                        const isResolved = roundComplete && (hasWinner || hasStroke);
                        const isExpanded = expandedGoodies.has(pg.id);

                        const sortedMembers = [...membersWithBrackets];
                        if (!roundComplete && !allPending) {
                          if (isBestRegion) {
                            sortedMembers.sort((a, b) => {
                              const entryA = allEntries.find((e) => e.userId === a.user_id)?.entry;
                              const entryB = allEntries.find((e) => e.userId === b.user_id)?.entry;
                              const correctA = entryA?.bestRegionCorrect ?? 0;
                              const correctB = entryB?.bestRegionCorrect ?? 0;
                              if (correctA !== correctB) return correctB - correctA;
                              return (entryA?.bestRegionPlayed ?? 0) - (entryB?.bestRegionPlayed ?? 0);
                            });
                          } else {
                            sortedMembers.sort((a, b) => {
                              const statusA = allEntries.find((e) => e.userId === a.user_id)?.entry?.status;
                              const statusB = allEntries.find((e) => e.userId === b.user_id)?.entry?.status;
                              const orderA = statusA === "alive" || statusA === "pending" ? 0 : 1;
                              const orderB = statusB === "alive" || statusB === "pending" ? 0 : 1;
                              return orderA - orderB;
                            });
                          }
                        }

                        const winners = isResolved
                          ? sortedMembers.filter((m) => {
                              const entry = allEntries.find((e) => e.userId === m.user_id)?.entry;
                              return entry?.status === "won" || entry?.status === "stroke";
                            })
                          : sortedMembers;
                        const nonWinners = isResolved
                          ? sortedMembers.filter((m) => {
                              const entry = allEntries.find((e) => e.userId === m.user_id)?.entry;
                              return entry?.status !== "won" && entry?.status !== "stroke";
                            })
                          : [];
                        const visibleMembers = isResolved
                          ? (isExpanded ? [...winners, ...nonWinners] : winners)
                          : sortedMembers;
                        const hiddenCount = isResolved ? sortedMembers.length - winners.length : 0;

                        return (
                          <div
                            key={pg.id}
                            className="rounded-md border border-card-border bg-background/60 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-stone-200">
                                  {pg.goody_types?.name ?? "Goodie"}
                                </span>
                                {pg.goody_types?.description && (
                                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                    {pg.goody_types.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="block text-xs text-muted-foreground">
                                  {pg.points} pts{pg.stroke_rule_enabled ? " (stroke rule)" : ""}
                                </span>
                                <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                                  {badgeText}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 border-t border-card-border pt-2">
                              {membersWithBrackets.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No brackets submitted yet.
                                </p>
                              ) : (
                                <>
                                  <ul className="space-y-1.5">
                                    {visibleMembers.map((member) => {
                                      const userEntry = allEntries.find((e) => e.userId === member.user_id);
                                      const entry = userEntry?.entry;
                                      const name = formatUserDisplayName(member.first_name, member.last_name) || "Anonymous";

                                      let displayText = "—";
                                      if (isLowestSeed && !isResolved) {
                                        if (entry?.bestCorrectTeamId) {
                                          const t = teamById.get(entry.bestCorrectTeamId);
                                          if (t) displayText = `(${t.seed}) ${t.name}`;
                                        } else if (entry?.status === "alive") {
                                          displayText = "Alive";
                                        } else if (entry?.status === "eliminated") {
                                          displayText = "Eliminated";
                                        } else {
                                          displayText = "Pending";
                                        }
                                      } else if (isBestRegion && entry?.bestRegion) {
                                        displayText = `${entry.bestRegion} (${entry.bestRegionCorrect ?? 0}/${entry.status === "won" ? 15 : entry.bestRegionPlayed ?? 0})`;
                                      } else if (entry?.bestCorrectTeamId) {
                                        const t = teamById.get(entry.bestCorrectTeamId);
                                        if (t) displayText = `(${t.seed}) ${t.name}`;
                                      } else if (entry?.bestAliveTeamId) {
                                        const t = teamById.get(entry.bestAliveTeamId);
                                        if (t) displayText = `(${t.seed}) ${t.name}`;
                                      } else if (!isLowestSeed) {
                                        const userPicks = bracketPicks.find((bp) => bp.userId === member.user_id);
                                        const derivedAnswer = userPicks
                                          ? getBracketDerivedGoodyAnswer(userPicks.picks, games, teams, goodyKey)
                                          : null;
                                        if (derivedAnswer) {
                                          displayText = `(${derivedAnswer.seed}) ${derivedAnswer.teamName}`;
                                        }
                                      }

                                      let statusColor = "text-stone-300";
                                      let statusBadge: string | null = null;
                                      if (entry?.status === "won") {
                                        statusColor = "text-emerald-300";
                                        statusBadge = `+${entry.pointsAwarded}`;
                                      } else if (entry?.status === "stroke") {
                                        statusColor = "text-emerald-300";
                                        statusBadge = `+${entry.pointsAwarded} (stroke)`;
                                      } else if (entry?.status === "eliminated") {
                                        statusColor = "text-red-400/60 line-through";
                                        statusBadge = "X";
                                      } else if (entry?.status === "not_awarded") {
                                        statusColor = "text-red-400/60";
                                      } else if (entry?.status === "alive") {
                                        statusColor = "text-stone-300";
                                      }

                                      const isCurrentUser = member.user_id === currentUserId;

                                      return (
                                        <li
                                          key={member.user_id}
                                          className={`flex items-center justify-between gap-2 text-xs rounded px-1.5 py-0.5 -mx-1.5 ${
                                            isCurrentUser ? "bg-accent/[0.03] ring-1 ring-inset ring-card-border-hover" : ""
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <UserAvatar
                                              avatarUrl={member.avatar_url}
                                              firstName={member.first_name}
                                              lastName={member.last_name}
                                              size="xs"
                                            />
                                            <span className="truncate text-stone-200">
                                              {name}
                                            </span>
                                            {isCurrentUser && (
                                              <span className="text-[9px] px-1 py-px rounded bg-accent/20 text-accent shrink-0">
                                                You
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-[11px] ${statusColor}`}>
                                              {displayText}
                                            </span>
                                            {statusBadge && (
                                              <span className={`text-[10px] font-medium ${
                                                entry?.status === "eliminated" || entry?.status === "not_awarded"
                                                  ? "text-red-400"
                                                  : "text-emerald-400"
                                              }`}>
                                                {statusBadge}
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  {isResolved && hiddenCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedGoodies((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(pg.id)) next.delete(pg.id);
                                          else next.add(pg.id);
                                          return next;
                                        });
                                      }}
                                      className="mt-2 text-[11px] text-stone-400 hover:text-stone-200 transition-colors"
                                    >
                                      {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const answersForGoody = goodyAnswers.filter(
                        (a) => a.goodyTypeId === pg.goody_type_id
                      );

                      const allEntries: { userId: string; entry: GoodyScoreEntry }[] = [];
                      for (const s of scores) {
                        const entry = s.perGoody?.[pg.goody_type_id];
                        if (entry) allEntries.push({ userId: s.userId, entry });
                      }

                      const hasResult = goodyResultByType.has(pg.goody_type_id);
                      const hasWinner = allEntries.some((e) => e.entry.status === "won");
                      const hasStroke = allEntries.some((e) => e.entry.status === "stroke");
                      const hasEliminated = allEntries.some((e) => e.entry.status === "eliminated");
                      const hasAlive = allEntries.some((e) => e.entry.status === "alive");

                      let badgeClass = "border-stone-500/60 bg-stone-500/10 text-stone-400";
                      let badgeText = "Pending";
                      if (hasWinner || hasStroke) {
                        badgeClass = "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
                        badgeText = hasStroke ? "Scored (stroke)" : "Scored";
                      } else if (hasResult && allEntries.some((e) => e.entry.status === "not_awarded")) {
                        badgeClass = "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
                        badgeText = "Scored";
                      } else if (hasAlive || hasEliminated) {
                        badgeClass = "border-amber-400/60 bg-amber-500/10 text-amber-200";
                        badgeText = "In Progress";
                      }

                      const isScored = (hasResult && (hasWinner || hasStroke || allEntries.some((e) => e.entry.status === "not_awarded")))
                        || (!hasResult && (hasWinner || hasStroke));

                      if (!isScored && (hasAlive || hasEliminated)) {
                        answersForGoody.sort((a, b) => {
                          const statusA = allEntries.find((e) => e.userId === a.userId)?.entry?.status;
                          const statusB = allEntries.find((e) => e.userId === b.userId)?.entry?.status;
                          const orderA = statusA === "alive" || statusA === "pending" || !statusA ? 0 : 1;
                          const orderB = statusB === "alive" || statusB === "pending" || !statusB ? 0 : 1;
                          return orderA - orderB;
                        });
                      }
                      const isExpanded = expandedGoodies.has(pg.id);
                      const winnerAnswers = isScored
                        ? answersForGoody.filter((a) => {
                            const entry = allEntries.find((e) => e.userId === a.userId)?.entry;
                            return entry?.status === "won" || entry?.status === "stroke";
                          })
                        : answersForGoody;
                      const nonWinnerAnswers = isScored
                        ? answersForGoody.filter((a) => {
                            const entry = allEntries.find((e) => e.userId === a.userId)?.entry;
                            return entry?.status !== "won" && entry?.status !== "stroke";
                          })
                        : [];
                      const visibleAnswers = isScored
                        ? (isExpanded ? [...winnerAnswers, ...nonWinnerAnswers] : winnerAnswers)
                        : answersForGoody;
                      const hiddenAnswerCount = isScored ? answersForGoody.length - winnerAnswers.length : 0;

                      return (
                        <div
                          key={pg.id}
                          className="rounded-md border border-card-border bg-background/60 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="text-stone-200">
                                {pg.goody_types?.name ?? "Goodie"}
                              </span>
                              {pg.goody_types?.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                  {pg.goody_types.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="block text-xs text-muted-foreground">
                                {pg.points} pts{pg.stroke_rule_enabled ? " (stroke rule)" : ""}
                              </span>
                              <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                                {badgeText}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 border-t border-card-border pt-2">
                            {answersForGoody.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No picks yet for this goodie.
                              </p>
                            ) : (
                              <>
                                <ul className="space-y-1.5">
                                  {visibleAnswers.map((answer) => {
                                    const member = members.find(
                                      (m) => m.user_id === answer.userId
                                    );
                                    if (!member) return null;

                                    const name =
                                      formatUserDisplayName(
                                        member.first_name,
                                        member.last_name
                                      ) || "Anonymous";

                                    const entry = allEntries.find((e) => e.userId === answer.userId)?.entry;
                                    const displayText = formatGoodyAnswerValue(pg, answer.value);

                                  let statusColor = "text-stone-300";
                                  let statusBadge: string | null = null;
                                  if (entry?.status === "won") {
                                    statusColor = "text-emerald-300";
                                    statusBadge = `+${entry.pointsAwarded}`;
                                  } else if (entry?.status === "stroke") {
                                    statusColor = "text-emerald-300";
                                    statusBadge = `+${entry.pointsAwarded} (stroke)`;
                                  } else if (entry?.status === "eliminated") {
                                    statusColor = "text-red-400/60 line-through";
                                    statusBadge = "X";
                                  } else if (entry?.status === "not_awarded") {
                                    statusColor = "text-red-400/60 line-through";
                                  }

                                    const isCurrentUser = member.user_id === currentUserId;

                                    return (
                                      <li
                                        key={`${answer.userId}-${answer.goodyTypeId}`}
                                        className={`flex items-center justify-between gap-2 text-xs rounded px-1.5 py-0.5 -mx-1.5 ${
                                          isCurrentUser ? "bg-accent/[0.03] ring-1 ring-inset ring-card-border-hover" : ""
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <UserAvatar
                                            avatarUrl={member.avatar_url}
                                            firstName={member.first_name}
                                            lastName={member.last_name}
                                            size="xs"
                                          />
                                          <span className="truncate text-stone-200">
                                            {name}
                                          </span>
                                          {isCurrentUser && (
                                            <span className="text-[9px] px-1 py-px rounded bg-accent/20 text-accent shrink-0">
                                              You
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className={`text-[11px] ${statusColor}`}>
                                            {displayText}
                                          </span>
                                          {statusBadge && (
                                            <span className={`text-[10px] font-medium ${
                                              entry?.status === "not_awarded" || entry?.status === "eliminated"
                                                ? "text-red-400"
                                                : "text-emerald-400"
                                            }`}>
                                              {statusBadge}
                                            </span>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                                {isScored && hiddenAnswerCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedGoodies((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(pg.id)) next.delete(pg.id);
                                        else next.add(pg.id);
                                        return next;
                                      });
                                    }}
                                    className="mt-2 text-[11px] text-stone-400 hover:text-stone-200 transition-colors"
                                  >
                                    {isExpanded ? "Show less" : `Show ${hiddenAnswerCount} more`}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "hall-of-fame" && hasHallOfFame && (
              <div className="px-3 py-3">
                <div className="divide-y divide-card-border/50">
                  {hallOfFame.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] md:grid-cols-[3rem_1fr_1fr_1fr] items-start md:items-center gap-x-2 md:gap-x-3 gap-y-0.5 md:gap-y-0 px-3 py-2 md:py-3">
                      <span className="text-sm md:text-base font-semibold text-stone-100 tabular-nums row-span-3 md:row-span-1 self-center">
                        {entry.year}
                      </span>
                      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <span className="shrink-0">🏆</span>
                        <span className="text-stone-100 font-medium truncate text-sm md:text-base">{entry.first_place}</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <span className="shrink-0">🥈</span>
                        <span className="text-stone-300 truncate text-sm md:text-base">{entry.second_place}</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <span className="shrink-0">🥉</span>
                        <span className="text-stone-400 truncate text-sm md:text-base">{entry.third_place ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

