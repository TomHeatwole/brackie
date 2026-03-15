"use client";

import { Team, TournamentGame, FINAL_FOUR_MATCHUPS, Region } from "@/lib/types";
import BracketMatchup from "./bracket-matchup";

interface Props {
  games: TournamentGame[];
  allGames: TournamentGame[];
  teams: Team[];
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
  picks,
  onPick,
  readOnly,
}: Props) {
  const ffGames = games
    .filter((g) => g.round === 5)
    .sort((a, b) => a.position - b.position);
  const champGame = games.find((g) => g.round === 6) ?? null;

  function getElite8Winner(region: Region): Team | null {
    const e8Game = allGames.find(
      (g) => g.round === 4 && g.region === region
    );
    if (!e8Game) return null;
    const winnerId = picks[e8Game.id];
    return winnerId ? getTeamById(teams, winnerId) : null;
  }

  function resolveFfTeams(game: TournamentGame): [Team | null, Team | null] {
    const matchup = FINAL_FOUR_MATCHUPS[game.position];
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
    <div className="flex flex-col items-center justify-center gap-3 px-4">
      {/* FF Game 1 */}
      {ffGames[0] && (() => {
        const [t1, t2] = resolveFfTeams(ffGames[0]);
        return (
          <div>
            <div className="text-[10px] text-stone-600 text-center mb-1 uppercase tracking-wider">
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
            <div className="text-[10px] text-stone-600 text-center mb-1 uppercase tracking-wider">
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
              <div className="mt-2 text-center">
                <div className="text-[10px] text-stone-600 uppercase tracking-wider mb-1">
                  Champion
                </div>
                <div
                  className="inline-block rounded px-3 py-1.5 text-sm font-bold"
                  style={{ backgroundColor: "#AE4E02", color: "#fff" }}
                >
                  ({champWinner.seed}) {champWinner.name}
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
            <div className="text-[10px] text-stone-600 text-center mb-1 uppercase tracking-wider">
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
