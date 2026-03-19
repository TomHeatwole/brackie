"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { PoolWithDetails, PoolMemberWithInfo, Team, TournamentGame, HallOfFameEntry } from "@/lib/types";
import type { PoolGoodyWithType } from "@/lib/pools";
import type { BracketScoreSummary, RoundGameEvaluation } from "@/lib/scoring";
import PoolScoringDisplay from "./pool-scoring-display";
import PicksTable from "./picks-table";
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
  hallOfFame?: HallOfFameEntry[];
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
  hallOfFame = [],
}: PoolTabsProps) {
  const hasGoodies = pool.goodies_enabled && poolGoodiesWithTypes.length > 0;
  const hasHallOfFame = hallOfFame.length > 0;
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const defaultTab: TabKey = "scores";
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

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
      return `Team ${String(value.team_id)}`;
    }
    if (value.game_id) {
      return `Game ${String(value.game_id)}`;
    }

    return "—";
  }

  function getTeamLabel(teamId: string) {
    const t = teamById.get(teamId);
    if (!t) return `Team ${teamId}`;
    return `${t.name} (${t.seed})`;
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

    const correct = evaluatedGames.filter((g) => g.status === "correct");
    const incorrect = evaluatedGames.filter((g) => g.status === "wrong" || g.status === "dead");

    // Show higher-value scoring picks first.
    const sortedCorrect = [...correct].sort((a, b) => b.pointsAwarded - a.pointsAwarded);
    const sortedIncorrect = [...incorrect].sort(
      (a, b) => (b.pointsIfCorrect ?? 0) - (a.pointsIfCorrect ?? 0)
    );

    return (
      <div
        className="relative inline-flex"
        onMouseEnter={() => {
          if (!isMobile) setOpen(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) setOpen(false);
        }}
        onClick={() => {
          if (isMobile) setOpen((o) => !o);
        }}
      >
        {children}

        <div
          className={`absolute z-20 left-1/2 top-full mt-1 w-72 -translate-x-1/2 rounded-md border px-3 py-2 text-[11px] shadow-lg backdrop-blur-sm border-card-border bg-stone-950/95 text-stone-200 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          } transition`}
        >
          <div className="font-semibold mb-2">{ROUND_HOVER_LABELS[round]} picks</div>

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
        <div className="border border-card-border rounded-lg overflow-hidden bg-card/60">
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

                        return (
                          <div
                            key={score.bracketId}
                            className="px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
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
                            <div className="w-full md:w-auto md:flex-1 md:justify-center">
                              <div className="grid grid-cols-7 gap-2 px-0 md:px-4">
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
                                <div className="flex flex-col items-center">
                                  <span className="text-[11px] text-stone-500">Goodies</span>
                                  <span className="text-base text-stone-200 tabular-nums font-semibold">
                                    {score.totalGoodyPoints ?? 0}
                                  </span>
                                  <span className="text-[11px] text-stone-600">(unscored)</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-right shrink-0">
                              <div>
                                <span className="text-stone-200 font-semibold tabular-nums text-base">
                                  {score.totalPoints}
                                </span>
                                <span className="text-stone-500 text-sm ml-0.5">pts</span>
                              </div>
                              <div>
                                <span className="text-stone-400 text-base tabular-nums">
                                  {score.possiblePoints}
                                </span>
                                <span className="text-stone-600 text-sm ml-0.5">possible</span>
                              </div>
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
                <PicksTable
                  games={games}
                  teams={teams}
                  members={members}
                  bracketPicks={bracketPicks}
                  scores={scores}
                />
              </div>
            )}

            {activeTab === "goodies" && (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                {!hasGoodies ? (
                  <p>This pool doesn&apos;t have any Goodies configured.</p>
                ) : (
                  <>
                    <p className="mb-3">
                      Goodies scoring is not yet live — all Goodies currently show as unscored.
                    </p>
                    <div className="space-y-3">
                      {poolGoodiesWithTypes.map((pg) => {
                        const answersForGoody = goodyAnswers.filter(
                          (a) => a.goodyTypeId === pg.goody_type_id
                        );

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
                                  {pg.points} pts
                                </span>
                                <span className="mt-0.5 inline-flex items-center rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                                  Unscored
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 border-t border-card-border pt-2">
                              {answersForGoody.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No picks yet for this goodie.
                                </p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {answersForGoody.map((answer) => {
                                    const member = members.find(
                                      (m) => m.user_id === answer.userId
                                    );
                                    if (!member) return null;

                                    const name =
                                      formatUserDisplayName(
                                        member.first_name,
                                        member.last_name
                                      ) || "Anonymous";

                                    return (
                                      <li
                                        key={`${answer.userId}-${answer.goodyTypeId}`}
                                        className="flex items-center justify-between gap-2 text-xs"
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
                                        </div>
                                        <span className="shrink-0 text-[11px] text-stone-300">
                                          {formatGoodyAnswerValue(
                                            pg,
                                            answer.value
                                          )}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "hall-of-fame" && hasHallOfFame && (
              <div className="px-3 py-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border">
                        <th className="text-left px-3 py-2 text-stone-400 font-medium">Year</th>
                        <th className="text-left px-3 py-2 text-amber-400 font-medium">1st</th>
                        <th className="text-left px-3 py-2 text-stone-400 font-medium">2nd</th>
                        <th className="text-left px-3 py-2 text-stone-500 font-medium">3rd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hallOfFame.map((entry) => (
                        <tr key={entry.id} className="border-b border-card-border/50 last:border-b-0">
                          <td className="px-3 py-2 text-stone-100 font-semibold tabular-nums">{entry.year}</td>
                          <td className="px-3 py-2 text-stone-100">{entry.first_place}</td>
                          <td className="px-3 py-2 text-stone-300">{entry.second_place}</td>
                          <td className="px-3 py-2 text-stone-400">{entry.third_place ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

