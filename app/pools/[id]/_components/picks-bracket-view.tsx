"use client";

import { useMemo, useCallback } from "react";
import type { Team, TournamentGame, BracketStructure, PoolMemberWithInfo } from "@/lib/types";
import type { BracketScoreSummary } from "@/lib/scoring";
import BracketTree from "@/app/_components/bracket-tree";
import PicksBracketMatchup, { type PickDistribution, type PickerDetail } from "./picks-bracket-matchup";
import { formatUserDisplayName } from "@/utils/display-name";

interface BracketPickEntry {
  bracketId: string;
  userId: string;
  picks: { game_id: string; picked_team_id: string }[];
}

interface Props {
  games: TournamentGame[];
  teams: Team[];
  bracketPicks: BracketPickEntry[];
  bracketStructure?: BracketStructure | null;
  members: PoolMemberWithInfo[];
  scores: BracketScoreSummary[];
}

export default function PicksBracketView({
  games,
  teams,
  bracketPicks,
  bracketStructure,
  members,
  scores,
}: Props) {
  const totalPickers = bracketPicks.length;

  const distributionByGame = useMemo(() => {
    const dist = new Map<string, Map<string, number>>();
    for (const bp of bracketPicks) {
      for (const p of bp.picks) {
        let gameMap = dist.get(p.game_id);
        if (!gameMap) {
          gameMap = new Map();
          dist.set(p.game_id, gameMap);
        }
        gameMap.set(p.picked_team_id, (gameMap.get(p.picked_team_id) ?? 0) + 1);
      }
    }
    return dist;
  }, [bracketPicks]);

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.user_id, formatUserDisplayName(m.first_name, m.last_name) || "Anonymous");
    }
    return map;
  }, [members]);

  const evaluatedByUserAndGame = useMemo(() => {
    const map = new Map<string, Map<string, { status: string; pointsAwarded: number }>>();
    for (const score of scores) {
      const gameMap = new Map<string, { status: string; pointsAwarded: number }>();
      for (const [, roundScore] of Object.entries(score.perRound)) {
        for (const eg of roundScore.evaluatedGames) {
          gameMap.set(eg.gameId, { status: eg.status, pointsAwarded: eg.pointsAwarded });
        }
      }
      map.set(score.userId, gameMap);
    }
    return map;
  }, [scores]);

  /** Per-game, per-team list of who picked it and their status/points */
  const pickersByGame = useMemo(() => {
    const result = new Map<string, Map<string, PickerDetail[]>>();
    for (const bp of bracketPicks) {
      const name = memberNameMap.get(bp.userId) ?? "Anonymous";
      const userEvals = evaluatedByUserAndGame.get(bp.userId);
      for (const p of bp.picks) {
        let gameMap = result.get(p.game_id);
        if (!gameMap) {
          gameMap = new Map();
          result.set(p.game_id, gameMap);
        }
        let teamList = gameMap.get(p.picked_team_id);
        if (!teamList) {
          teamList = [];
          gameMap.set(p.picked_team_id, teamList);
        }
        const evaluation = userEvals?.get(p.game_id);
        teamList.push({
          name,
          status: (evaluation?.status as "correct" | "wrong" | "dead") ?? null,
          pointsAwarded: evaluation?.pointsAwarded ?? 0,
        });
      }
    }
    return result;
  }, [bracketPicks, memberNameMap, evaluatedByUserAndGame]);

  /** Only use actual game results to resolve downstream teams.
   *  Consensus picks were misleading -- they made it look like a team
   *  had advanced when the game hasn't been played yet. */
  const actualResultPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    for (const game of games) {
      if (game.winner_id) {
        picks[game.id] = game.winner_id;
      }
    }
    return picks;
  }, [games]);

  const teamById = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const eliminatedTeamIds = useMemo(() => {
    const eliminated = new Set<string>();
    for (const game of games) {
      if (!game.winner_id) continue;
      if (game.team1_id && game.team1_id !== game.winner_id) eliminated.add(game.team1_id);
      if (game.team2_id && game.team2_id !== game.winner_id) eliminated.add(game.team2_id);
    }
    return eliminated;
  }, [games]);

  const renderMatchup = useCallback(
    (game: TournamentGame, team1: Team | null, team2: Team | null) => {
      const counts = distributionByGame.get(game.id) ?? new Map<string, number>();
      const distribution: PickDistribution = { counts, totalPickers };
      const pickers = pickersByGame.get(game.id) ?? new Map<string, PickerDetail[]>();
      return (
        <PicksBracketMatchup
          game={game}
          team1={team1}
          team2={team2}
          distribution={distribution}
          pickers={pickers}
          teamById={teamById}
          eliminatedTeamIds={eliminatedTeamIds}
        />
      );
    },
    [distributionByGame, totalPickers, pickersByGame, teamById, eliminatedTeamIds]
  );

  return (
    <BracketTree
      teams={teams}
      games={games}
      bracketStructure={bracketStructure}
      initialPicks={actualResultPicks}
      readOnly
      renderMatchup={renderMatchup}
    />
  );
}
