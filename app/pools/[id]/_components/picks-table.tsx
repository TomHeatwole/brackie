"use client";

import { useState, useMemo } from "react";
import type { TournamentGame, Team, PoolMemberWithInfo } from "@/lib/types";
import { ROUND_NAMES } from "@/lib/types";
import type { BracketScoreSummary, RoundGameStatus } from "@/lib/scoring";
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
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

const ROUND_SHORT_LABELS: Record<number, string> = {
  1: "R64",
  2: "R32",
  3: "S16",
  4: "E8",
  5: "F4",
  6: "Champ",
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
}: PicksTableProps) {
  const [selectedRound, setSelectedRound] = useState(1);
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

  const showRegionFilters = selectedRound <= 4;

  const filteredGames = useMemo(() => {
    return games
      .filter((g) => g.round === selectedRound)
      .filter((g) => {
        if (selectedRound > 4) return true;
        return g.region != null && enabledRegions.has(g.region);
      })
      .sort((a, b) => {
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
    const map = new Map<string, Map<string, RoundGameStatus>>();
    for (const score of scores) {
      const gameMap = new Map<string, RoundGameStatus>();
      for (const [, roundScore] of Object.entries(score.perRound)) {
        for (const eg of roundScore.evaluatedGames) {
          gameMap.set(eg.gameId, eg.status);
        }
      }
      map.set(score.userId, gameMap);
    }
    return map;
  }, [scores]);

  const membersWithBrackets = useMemo(() => {
    const bracketUserIds = new Set(bracketPicks.map((bp) => bp.userId));
    return members.filter((m) => bracketUserIds.has(m.user_id));
  }, [members, bracketPicks]);

  function getPickStatus(userId: string, gameId: string): PickStatus {
    const userPicks = picksByUserAndGame.get(userId);
    if (!userPicks || !userPicks.has(gameId)) return "no-pick";

    const evaluated = evaluatedByUserAndGame.get(userId);
    const status = evaluated?.get(gameId);
    if (status) return status;

    return "alive";
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

  if (games.length === 0 || bracketPicks.length === 0) {
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
            onClick={() => setSelectedRound(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedRound === r
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-stone-400 hover:text-stone-200 hover:border-card-border-hover"
            }`}
          >
            {ROUND_SHORT_LABELS[r]}
          </button>
        ))}
        <span className="ml-2 text-xs text-stone-500">{ROUND_NAMES[selectedRound]}</span>
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
      {filteredGames.length === 0 ? (
        <p className="text-sm text-muted-foreground">No games match the selected filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-card-border">
          <table className="w-max min-w-full text-xs border-collapse">
            <thead>
              {/* Region grouping header */}
              {showRegionFilters && (
                <tr>
                  <th className="sticky left-0 z-10 bg-stone-950 border-b border-r border-card-border" />
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
                        className="px-2 py-1.5 text-center text-[11px] font-semibold text-stone-400 bg-stone-950 border-b border-card-border"
                      >
                        {s.region}
                      </th>
                    ));
                  })()}
                </tr>
              )}
              {/* Game matchup header */}
              <tr>
                <th className="sticky left-0 z-10 bg-stone-950 px-3 py-2 text-left text-stone-400 font-medium border-b border-r border-card-border whitespace-nowrap min-w-[140px]">
                  Player
                </th>
                {filteredGames.map((game) => {
                  const t1 = getTeamLabel(game.team1_id);
                  const t2 = getTeamLabel(game.team2_id);
                  const isRegionBoundary = regionBoundaryGameIds.has(game.id);

                  return (
                    <th
                      key={game.id}
                      className={`px-2 py-2 text-center font-normal border-b border-card-border bg-stone-950 whitespace-nowrap ${
                        isRegionBoundary ? "border-l-2 border-l-card-border-hover" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="flex items-center gap-1">
                          {t1.team && <TeamIcon team={t1.team} size="xs" />}
                          <span className="text-stone-300">
                            {t1.team ? `(${t1.team.seed}) ${t1.label}` : t1.label}
                          </span>
                        </span>
                        <span className="text-stone-600 text-[10px]">vs</span>
                        <span className="flex items-center gap-1">
                          {t2.team && <TeamIcon team={t2.team} size="xs" />}
                          <span className="text-stone-300">
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
                    <td className="sticky left-0 z-10 bg-stone-950 px-3 py-2 border-r border-card-border">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <UserAvatar
                          avatarUrl={member.avatar_url}
                          firstName={member.first_name}
                          lastName={member.last_name}
                          size="xs"
                        />
                        <span className="text-stone-200 text-xs font-medium truncate max-w-[120px]">
                          {name}
                        </span>
                      </div>
                    </td>
                    {filteredGames.map((game) => {
                      const status = getPickStatus(member.user_id, game.id);
                      const pickedTeamId = picksByUserAndGame.get(member.user_id)?.get(game.id) ?? null;
                      const picked = getTeamLabel(pickedTeamId);
                      const statusClasses = getPickStatusClasses(status);
                      const isRegionBoundary = regionBoundaryGameIds.has(game.id);

                      return (
                        <td
                          key={game.id}
                          className={`px-2 py-2 text-center ${statusClasses} ${
                            isRegionBoundary ? "border-l-2 border-l-card-border-hover" : ""
                          }`}
                        >
                          {status === "no-pick" ? (
                            <span className="text-stone-600">&mdash;</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                              {picked.team && <TeamIcon team={picked.team} size="xs" />}
                              <span>
                                {picked.team
                                  ? `(${picked.team.seed}) ${picked.label}`
                                  : picked.label}
                              </span>
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
      )}
    </div>
  );
}
