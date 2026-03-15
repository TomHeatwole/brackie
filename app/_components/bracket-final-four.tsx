"use client";

import { Team, TournamentGame } from "@/lib/types";
import BracketMatchup from "./bracket-matchup";
import TeamIcon from "./team-icon";

interface Props {
  games: TournamentGame[];
  allGames: TournamentGame[];
  teams: Team[];
  /** Which regions feed each FF game: [game0pair, game1pair] */
  finalFourMatchups: [string, string][];
  picks: Record<string, string>;
  onPick: (gameId: string, teamId: string) => void;
  readOnly: boolean;
}

function getTeamById(teams: Team[], id: string | null): Team | null {
  if (!id) return null;
  return teams.find((t) => t.id === id) ?? null;
}

export default function BracketFinalFour({
  games,
  allGames,
  teams,
  finalFourMatchups,
  picks,
  onPick,
  readOnly,
}: Props) {
  const ffGames = games
    .filter((g) => g.round === 5)
    .sort((a, b) => a.position - b.position);
  const champGame = games.find((g) => g.round === 6) ?? null;

  function getElite8Winner(region: string): Team | null {
    const e8Game = allGames.find(
      (g) => g.round === 4 && g.region === region
    );
    if (!e8Game) return null;
    const winnerId = picks[e8Game.id];
    return winnerId ? getTeamById(teams, winnerId) : null;
  }

  function resolveFfTeams(game: TournamentGame): [Team | null, Team | null] {
    const matchup = finalFourMatchups[game.position];
    if (!matchup) return [null, null];
    return [getElite8Winner(matchup[0]), getElite8Winner(matchup[1])];
  }

  function resolveChampTeams(): [Team | null, Team | null] {
    if (ffGames.length < 2) return [null, null];
    const t1Id = picks[ffGames[0].id] ?? null;
    const t2Id = picks[ffGames[1].id] ?? null;
    return [getTeamById(teams, t1Id), getTeamById(teams, t2Id)];
  }

  const champWinner = champGame ? getTeamById(teams, picks[champGame.id] ?? null) : null;

  return (
    <div className="flex items-start justify-center gap-6 px-4">
      {/* FF Game 1 */}
      {ffGames[0] && (() => {
        const [t1, t2] = resolveFfTeams(ffGames[0]);
        return (
          <div>
            <div className="text-[12px] text-muted text-center mb-1 uppercase tracking-widest font-semibold">
              Final Four
            </div>
            <BracketMatchup
              team1={t1}
              team2={t2}
              pickedTeamId={picks[ffGames[0].id] ?? null}
              onPick={(teamId) => onPick(ffGames[0].id, teamId)}
              readOnly={readOnly}
            />
          </div>
        );
      })()}

      {/* Championship */}
      {champGame && (() => {
        const [t1, t2] = resolveChampTeams();
        return (
          <div>
            <div className="text-[12px] text-muted text-center mb-1 uppercase tracking-widest font-semibold">
              Championship
            </div>
            <BracketMatchup
              team1={t1}
              team2={t2}
              pickedTeamId={picks[champGame.id] ?? null}
              onPick={(teamId) => onPick(champGame.id, teamId)}
              readOnly={readOnly}
            />
            {champWinner && (
              <div className="mt-3 text-center">
                <div className="text-[12px] text-accent uppercase tracking-widest mb-1.5 font-semibold">
                  Champion
                </div>
                <div className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-base font-bold bg-accent text-white shadow-lg shadow-accent/20">
                  <TeamIcon team={champWinner} size="sm" />
                  <span>({champWinner.seed}) {champWinner.name}</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* FF Game 2 */}
      {ffGames[1] && (() => {
        const [t1, t2] = resolveFfTeams(ffGames[1]);
        return (
          <div>
            <div className="text-[12px] text-muted text-center mb-1 uppercase tracking-widest font-semibold">
              Final Four
            </div>
            <BracketMatchup
              team1={t1}
              team2={t2}
              pickedTeamId={picks[ffGames[1].id] ?? null}
              onPick={(teamId) => onPick(ffGames[1].id, teamId)}
              readOnly={readOnly}
            />
          </div>
        );
      })()}
    </div>
  );
}
