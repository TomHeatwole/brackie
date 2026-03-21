"use client";

import { Team, TournamentGame } from "@/lib/types";
import BracketMatchup from "./bracket-matchup";
import type { PickStatus } from "./bracket-matchup";
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
  renderMatchup?: (game: TournamentGame, team1: Team | null, team2: Team | null) => React.ReactNode;
  pickStatuses?: Map<string, PickStatus>;
  eliminatedTeamIds?: Set<string>;
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
  renderMatchup,
  pickStatuses,
  eliminatedTeamIds,
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
  const champStatus = champGame ? pickStatuses?.get(champGame.id) : undefined;

  function getChampionStyle(): { bg: string; text: string; shadow: string; strikethrough: boolean } {
    switch (champStatus) {
      case "correct":
        return { bg: "rgb(16, 185, 129)", text: "#fff", shadow: "0 4px 14px rgba(16, 185, 129, 0.3)", strikethrough: false };
      case "wrong":
        return { bg: "rgba(239, 68, 68, 0.2)", text: "rgba(252, 165, 165, 0.7)", shadow: "none", strikethrough: true };
      case "dead":
        return { bg: "rgba(239, 68, 68, 0.1)", text: "rgba(252, 165, 165, 0.45)", shadow: "none", strikethrough: true };
      default:
        return { bg: "var(--accent)", text: "#fff", shadow: "0 4px 14px rgba(194, 85, 10, 0.2)", strikethrough: false };
    }
  }

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
            {renderMatchup ? renderMatchup(ffGames[0], t1, t2) : (
              <BracketMatchup
                team1={t1}
                team2={t2}
                pickedTeamId={picks[ffGames[0].id] ?? null}
                onPick={(teamId) => onPick(ffGames[0].id, teamId)}
                readOnly={readOnly}
                pickStatus={pickStatuses?.get(ffGames[0].id)}
                eliminatedTeamIds={eliminatedTeamIds}
              />
            )}
          </div>
        );
      })()}

      {/* Championship */}
      {champGame && (() => {
        const [t1, t2] = resolveChampTeams();
        const champStyle = getChampionStyle();
        return (
          <div>
            <div className="text-[12px] text-muted text-center mb-1 uppercase tracking-widest font-semibold">
              Championship
            </div>
            {renderMatchup ? renderMatchup(champGame, t1, t2) : (
              <BracketMatchup
                team1={t1}
                team2={t2}
                pickedTeamId={picks[champGame.id] ?? null}
                onPick={(teamId) => onPick(champGame.id, teamId)}
                readOnly={readOnly}
                pickStatus={pickStatuses?.get(champGame.id)}
                eliminatedTeamIds={eliminatedTeamIds}
              />
            )}
            {champWinner && (
              <div className="mt-3 text-center">
                <div
                  className="text-[12px] uppercase tracking-widest mb-1.5 font-semibold"
                  style={{ color: champStatus === "correct" ? "rgb(16, 185, 129)" : champStatus === "wrong" || champStatus === "dead" ? "rgba(252, 165, 165, 0.5)" : "var(--accent)" }}
                >
                  Champion
                </div>
                <div
                  className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-base font-bold"
                  style={{
                    backgroundColor: champStyle.bg,
                    color: champStyle.text,
                    boxShadow: champStyle.shadow,
                  }}
                >
                  <TeamIcon team={champWinner} size="sm" />
                  <span className={champStyle.strikethrough ? "line-through" : ""}>
                    ({champWinner.seed}) {champWinner.name}
                  </span>
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
            {renderMatchup ? renderMatchup(ffGames[1], t1, t2) : (
              <BracketMatchup
                team1={t1}
                team2={t2}
                pickedTeamId={picks[ffGames[1].id] ?? null}
                onPick={(teamId) => onPick(ffGames[1].id, teamId)}
                readOnly={readOnly}
                pickStatus={pickStatuses?.get(ffGames[1].id)}
                eliminatedTeamIds={eliminatedTeamIds}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}
