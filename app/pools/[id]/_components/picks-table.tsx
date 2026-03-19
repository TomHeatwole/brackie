"use client";

import { useState, useMemo } from "react";
import type { TournamentGame, Team, PoolMemberWithInfo } from "@/lib/types";
import type { BracketScoreSummary, RoundGameStatus } from "@/lib/scoring";
import type { PoolGoodyWithType } from "@/lib/pools";
import TeamIcon from "@/app/_components/team-icon";
import UserAvatar from "@/app/_components/user-avatar";
import { formatUserDisplayName } from "@/utils/display-name";

interface BracketPickEntry {
  bracketId: string;
  userId: string;
  picks: { game_id: string; picked_team_id: string }[];
}

interface PicksTableProps {
  games: TournamentGame[];
  teams: Team[];
  members: PoolMemberWithInfo[];
  bracketPicks: BracketPickEntry[];
  scores: BracketScoreSummary[];
  poolId: string;
  modeParam?: string;
  poolGoodiesWithTypes?: PoolGoodyWithType[];
  goodyAnswers?: {
    userId: string;
    goodyTypeId: string;
    value: Record<string, unknown> | null;
  }[];
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5] as const;

const ROUND_SHORT_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
};

type PickStatus = RoundGameStatus | "alive" | "no-pick";

function getPickStatusClasses(status: PickStatus): string {
  switch (status) {
    case "correct":
      return "bg-emerald-900/40 text-emerald-300";
    case "wrong":
      return "bg-red-900/40 text-red-300 line-through";
    case "dead":
      return "bg-red-900/20 text-red-400/60 line-through";
    case "alive":
      return "text-stone-300";
    case "no-pick":
      return "text-stone-600";
  }
}

export default function PicksTable({
  games,
  teams,
  members,
  bracketPicks,
  scores,
  poolId,
  modeParam,
  poolGoodiesWithTypes = [],
  goodyAnswers = [],
}: PicksTableProps) {
  const [selectedRound, setSelectedRound] = useState(1);
  const [activeView, setActiveView] = useState<"round" | "goodies">("round");
  const [enabledRegions, setEnabledRegions] = useState<Set<string>>(() => {
    const regions = new Set<string>();
    for (const g of games) {
      if (g.region) regions.add(g.region);
    }
    return regions;
  });

  const teamById = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const allRegions = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      if (g.region) set.add(g.region);
    }
    return Array.from(set);
  }, [games]);

  const showRegionFilters = activeView === "round" && selectedRound <= 4;

  const filteredGames = useMemo(() => {
    const roundsToShow = selectedRound === 5 ? new Set([5, 6]) : new Set([selectedRound]);

    return games
      .filter((g) => roundsToShow.has(g.round))
      .filter((g) => {
        if (selectedRound > 4) return true;
        return g.region != null && enabledRegions.has(g.region);
      })
      .sort((a, b) => {
        if (selectedRound === 5) {
          // For "Final Four", show:
          // - Round 5 game 0
          // - Round 5 game 1
          // - Round 6 (Championship)
          const roundCmp = a.round - b.round;
          if (roundCmp !== 0) return roundCmp;
          return a.position - b.position;
        }

        const regionCmp = (a.region ?? "").localeCompare(b.region ?? "");
        if (regionCmp !== 0) return regionCmp;
        return a.position - b.position;
      });
  }, [games, selectedRound, enabledRegions]);

  const picksByUserAndGame = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const bp of bracketPicks) {
      const gameMap = new Map<string, string>();
      for (const p of bp.picks) {
        gameMap.set(p.game_id, p.picked_team_id);
      }
      map.set(bp.userId, gameMap);
    }
    return map;
  }, [bracketPicks]);

  const evaluatedByUserAndGame = useMemo(() => {
    const map = new Map<string, Map<string, { status: RoundGameStatus; pointsAwarded: number }>>();
    for (const score of scores) {
      const gameMap = new Map<string, { status: RoundGameStatus; pointsAwarded: number }>();
      for (const [, roundScore] of Object.entries(score.perRound)) {
        for (const eg of roundScore.evaluatedGames) {
          gameMap.set(eg.gameId, { status: eg.status, pointsAwarded: eg.pointsAwarded });
        }
      }
      map.set(score.userId, gameMap);
    }
    return map;
  }, [scores]);

  const membersWithBrackets = useMemo(() => {
    const bracketUserIds = new Set(bracketPicks.map((bp) => bp.userId));
    const filtered = members.filter((m) => bracketUserIds.has(m.user_id));

    // Sort rows to match the Scores leaderboard:
    // totalPoints desc, then possiblePoints desc.
    const sortedScores = [...scores].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.possiblePoints - a.possiblePoints;
    });
    const rankByUserId = new Map<string, number>();
    for (let i = 0; i < sortedScores.length; i++) {
      rankByUserId.set(sortedScores[i].userId, i);
    }

    return filtered.sort((a, b) => {
      const ra = rankByUserId.get(a.user_id) ?? Number.MAX_SAFE_INTEGER;
      const rb = rankByUserId.get(b.user_id) ?? Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });
  }, [members, bracketPicks, scores]);

  function getPickStatus(userId: string, gameId: string): PickStatus {
    const userPicks = picksByUserAndGame.get(userId);
    if (!userPicks || !userPicks.has(gameId)) return "no-pick";

    const evaluated = evaluatedByUserAndGame.get(userId);
    const entry = evaluated?.get(gameId);
    if (entry) return entry.status;

    return "alive";
  }

  function getPointsAwarded(userId: string, gameId: string): number {
    return evaluatedByUserAndGame.get(userId)?.get(gameId)?.pointsAwarded ?? 0;
  }

  function toggleRegion(region: string) {
    setEnabledRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  }

  function getTeamLabel(teamId: string | null): { team: Team | null; label: string } {
    if (!teamId) return { team: null, label: "TBD" };
    const t = teamById.get(teamId);
    if (!t) return { team: null, label: "?" };
    return { team: t, label: t.name };
  }

  const gameById = useMemo(() => {
    const map = new Map<string, TournamentGame>();
    for (const g of games) map.set(g.id, g);
    return map;
  }, [games]);

  const goodyByUser = useMemo(() => {
    const map = new Map<string, Map<string, Record<string, unknown> | null>>();
    for (const ans of goodyAnswers) {
      const userMap = map.get(ans.userId) ?? new Map<string, Record<string, unknown> | null>();
      userMap.set(ans.goodyTypeId, ans.value);
      map.set(ans.userId, userMap);
    }
    return map;
  }, [goodyAnswers]);

  function formatGoodyAnswerValue(rawValue: Record<string, unknown> | null) {
    if (!rawValue) return "—";

    const value = rawValue as {
      conference_key?: unknown;
      nit_matchup?: unknown;
      team_id?: unknown;
      game_id?: unknown;
    };

    if (value.conference_key) return String(value.conference_key);
    if (value.nit_matchup) return String(value.nit_matchup);

    if (value.team_id) {
      const teamId = String(value.team_id);
      const t = teamById.get(teamId);
      if (t) return `${t.name} (${t.seed})`;
      return `Team ${teamId}`;
    }

    if (value.game_id) {
      const gameId = String(value.game_id);
      const g = gameById.get(gameId);
      if (!g) return `Game ${gameId}`;

      const t1 = g.team1_id ? teamById.get(g.team1_id) : null;
      const t2 = g.team2_id ? teamById.get(g.team2_id) : null;
      if (t1 && t2) return `${t1.name} (${t1.seed}) vs ${t2.name} (${t2.seed})`;

      return `Game ${gameId}`;
    }

    return "—";
  }

  const regionBoundaryGameIds = useMemo(() => {
    if (!showRegionFilters) return new Set<string>();
    const ids = new Set<string>();
    let prev: string | null = null;
    for (const g of filteredGames) {
      if (g.region !== prev) {
        ids.add(g.id);
        prev = g.region;
      }
    }
    return ids;
  }, [filteredGames, showRegionFilters]);

  if (activeView === "round" && (games.length === 0 || bracketPicks.length === 0)) {
    return (
      <p className="text-sm text-muted-foreground">
        Picks will appear here once brackets have been submitted and games are available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Round selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ROUND_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setActiveView("round");
              setSelectedRound(r);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeView === "round" && selectedRound === r
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-stone-400 hover:text-stone-200 hover:border-card-border-hover"
            }`}
          >
            {ROUND_SHORT_LABELS[r]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActiveView("goodies")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeView === "goodies"
              ? "bg-accent text-white"
              : "bg-card border border-card-border text-stone-400 hover:text-stone-200 hover:border-card-border-hover"
          }`}
        >
          Goodies
        </button>
      </div>

      {/* Region filters */}
      {showRegionFilters && allRegions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-stone-500">Regions:</span>
          {allRegions.map((region) => (
            <label key={region} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enabledRegions.has(region)}
                onChange={() => toggleRegion(region)}
                className="accent-accent w-3.5 h-3.5"
              />
              <span className="text-xs text-stone-300">{region}</span>
            </label>
          ))}
        </div>
      )}

      {/* Table */}
      {activeView === "round" ? (filteredGames.length === 0 ? (
        <p className="text-sm text-muted-foreground">No games match the selected filters.</p>
      ) : (
        <div className="scrollbar-custom-x overflow-x-auto rounded-md border border-card-border">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              {/* Region grouping header */}
              {showRegionFilters && (
                <tr>
                  <th className="sticky left-0 z-10 bg-stone-900 border-b border-r border-card-border" />
                  {(() => {
                    const spans: { region: string; count: number }[] = [];
                    let prev: string | null = null;
                    for (const g of filteredGames) {
                      const r = g.region ?? "";
                      if (r === prev) {
                        spans[spans.length - 1].count++;
                      } else {
                        spans.push({ region: r, count: 1 });
                        prev = r;
                      }
                    }
                    return spans.map((s) => (
                      <th
                        key={s.region}
                        colSpan={s.count}
                        className="px-2 py-2 text-center text-[11px] font-semibold text-stone-400 bg-stone-900 border-b border-card-border"
                      >
                        {s.region}
                      </th>
                    ));
                  })()}
                </tr>
              )}
              {/* Game matchup header */}
              <tr>
                <th className="sticky left-0 z-10 bg-stone-900 px-3 py-3 text-left text-stone-400 font-medium border-b border-r border-card-border whitespace-nowrap w-[190px] min-w-[190px]">
                  Player
                </th>
                {filteredGames.map((game, idx) => {
                  const t1 = getTeamLabel(game.team1_id);
                  const t2 = getTeamLabel(game.team2_id);
                  const isRegionBoundary = regionBoundaryGameIds.has(game.id);

                  return (
                    <th
                      key={game.id}
                      className={`px-2 py-3 text-center font-normal border-b border-card-border bg-stone-900 whitespace-nowrap ${
                        idx > 0 ? "border-l border-card-border" : ""
                      } ${isRegionBoundary ? "border-l-2 border-l-card-border-hover" : ""}`}
                      style={{ minWidth: 140 }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="flex items-center gap-1">
                          {t1.team && <TeamIcon team={t1.team} size="xs" />}
                          <span className="text-stone-300 truncate max-w-[160px]">
                            {t1.team ? `(${t1.team.seed}) ${t1.label}` : t1.label}
                          </span>
                        </span>
                        <span className="text-stone-600 text-[10px]">vs</span>
                        <span className="flex items-center gap-1">
                          {t2.team && <TeamIcon team={t2.team} size="xs" />}
                          <span className="text-stone-300 truncate max-w-[160px]">
                            {t2.team ? `(${t2.team.seed}) ${t2.label}` : t2.label}
                          </span>
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {membersWithBrackets.map((member) => {
                const name =
                  formatUserDisplayName(member.first_name, member.last_name) || "Anonymous";

                return (
                  <tr key={member.user_id} className="border-b border-card-border last:border-b-0">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2.5 border-r border-card-border w-[190px] min-w-[190px]">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <UserAvatar
                            avatarUrl={member.avatar_url}
                            firstName={member.first_name}
                            lastName={member.last_name}
                            size="xs"
                          />
                          <span className="text-stone-200 text-sm font-medium truncate max-w-[130px]">
                            {name}
                          </span>
                        </div>
                        {member.bracket_id && (
                          <a
                            href={`/brackets/${member.bracket_id}${modeParam ? modeParam + "&" : "?"}pool=${poolId}`}
                            className="text-xs text-accent hover:underline ml-7"
                          >
                            {member.bracket_name ?? "Bracket submitted"}
                          </a>
                        )}
                      </div>
                    </td>
                    {filteredGames.map((game) => {
                      const status = getPickStatus(member.user_id, game.id);
                      const pickedTeamId = picksByUserAndGame.get(member.user_id)?.get(game.id) ?? null;
                      const picked = getTeamLabel(pickedTeamId);
                      const statusClasses = getPickStatusClasses(status);
                      const isRegionBoundary = regionBoundaryGameIds.has(game.id);
                      const pts = status === "correct" ? getPointsAwarded(member.user_id, game.id) : 0;

                      return (
                        <td
                          key={game.id}
                          className={`px-2 py-2.5 text-center ${statusClasses} ${
                            isRegionBoundary ? "border-l-2 border-l-card-border-hover" : ""
                          }`}
                          style={{ minWidth: 140 }}
                        >
                          {status === "no-pick" ? (
                            <span className="text-stone-600">&mdash;</span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                                {picked.team && <TeamIcon team={picked.team} size="xs" />}
                                <span className="truncate max-w-[160px]">
                                  {picked.team
                                    ? `(${picked.team.seed}) ${picked.label}`
                                    : picked.label}
                                </span>
                              </div>
                              {pts > 0 && (
                                <span className="text-[10px] text-emerald-400 font-medium">+{pts}</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )) : (
        <>
          {poolGoodiesWithTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goodies configured for this pool.</p>
          ) : (
            <div className="scrollbar-custom-x overflow-x-auto rounded-md border border-card-border">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-stone-900 px-3 py-3 text-left text-stone-400 font-medium border-b border-r border-card-border whitespace-nowrap w-[190px] min-w-[190px]">
                      Player
                    </th>
                    {poolGoodiesWithTypes.map((pg, idx) => (
                      <th
                        key={pg.id}
                        className={`px-2 py-3 text-center font-normal border-b border-card-border bg-stone-900 whitespace-nowrap ${
                          idx > 0 ? "border-l border-card-border" : ""
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-stone-300 text-[11px] font-semibold">
                            {pg.goody_types?.name ?? "Goodie"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {membersWithBrackets.map((member) => {
                    const name =
                      formatUserDisplayName(member.first_name, member.last_name) || "Anonymous";
                    const userMap = goodyByUser.get(member.user_id) ?? new Map();
                    return (
                      <tr key={member.user_id} className="border-b border-card-border last:border-b-0">
                        <td className="sticky left-0 z-10 bg-card px-3 py-2.5 border-r border-card-border w-[190px] min-w-[190px]">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <UserAvatar
                                avatarUrl={member.avatar_url}
                                firstName={member.first_name}
                                lastName={member.last_name}
                                size="xs"
                              />
                              <span className="text-stone-200 text-sm font-medium truncate max-w-[130px]">
                                {name}
                              </span>
                            </div>
                            {member.bracket_id && (
                              <a
                                href={`/brackets/${member.bracket_id}${modeParam ? modeParam + "&" : "?"}pool=${poolId}`}
                                className="text-xs text-accent hover:underline ml-7"
                              >
                                {member.bracket_name ?? "Bracket submitted"}
                              </a>
                            )}
                          </div>
                        </td>
                        {poolGoodiesWithTypes.map((pg) => {
                          const raw = userMap.get(pg.goody_type_id) ?? null;
                          const display = formatGoodyAnswerValue(raw);
                          return (
                            <td
                              key={pg.id}
                              className="px-2 py-2.5 text-center border-l-0 border-b border-card-border"
                            >
                              <span className="block truncate max-w-[220px] text-stone-300">
                                {display}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
