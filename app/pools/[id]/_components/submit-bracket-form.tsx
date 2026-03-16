"use client";

import { useActionState } from "react";
import { submitBracketToPoolAction, SubmitBracketFormState } from "../actions";
import {
  BracketWithPicks,
  Team,
  TournamentGame,
  ELITE_CONFERENCES,
  TOTAL_GAMES,
} from "@/lib/types";
import type { PoolGoodyWithType } from "@/lib/pools";
import type { PoolBracketGoodyAnswer } from "@/lib/types";

const initialState: SubmitBracketFormState = {};

interface Props {
  poolId: string;
  brackets: BracketWithPicks[];
  currentBracketId?: string;
  userInputGoodies?: PoolGoodyWithType[];
  existingGoodyAnswers?: PoolBracketGoodyAnswer[];
  teams?: Team[];
  firstRoundGames?: TournamentGame[];
}

function getExistingValue(
  goodyTypeId: string,
  answers: PoolBracketGoodyAnswer[],
  key: string
): string {
  const a = answers.find((x) => x.goody_type_id === goodyTypeId);
  if (!a?.value) return "";
  if (key === "conference_key" && "conference_key" in a.value) {
    return String(a.value.conference_key);
  }
  if (key === "team_id" && "team_id" in a.value) {
    return String(a.value.team_id);
  }
  if (key === "game_id" && "game_id" in a.value) {
    return String(a.value.game_id);
  }
  return "";
}

function gameLabel(game: TournamentGame, teams: Team[]): string {
  const team1 = game.team1_id ? teams.find((t) => t.id === game.team1_id) : null;
  const team2 = game.team2_id ? teams.find((t) => t.id === game.team2_id) : null;
  const n1 = team1 ? `${team1.seed} ${team1.name}` : "TBD";
  const n2 = team2 ? `${team2.seed} ${team2.name}` : "TBD";
  return `${n1} vs ${n2}`;
}

export default function SubmitBracketForm({
  poolId,
  brackets,
  currentBracketId,
  userInputGoodies = [],
  existingGoodyAnswers = [],
  teams = [],
  firstRoundGames = [],
}: Props) {
  const [state, action, isPending] = useActionState(submitBracketToPoolAction, initialState);

  const completedBrackets = brackets.filter((b) => b.pick_count === TOTAL_GAMES);

  if (brackets.length === 0) {
    return (
      <p className="text-muted text-sm">
        You don&apos;t have any brackets yet. Create one first!
      </p>
    );
  }

  if (completedBrackets.length === 0) {
    return (
      <p className="text-muted text-sm">
        You don&apos;t have any completed brackets. Fill out all 63 picks in a bracket first, then come back to submit it.
      </p>
    );
  }

  const hasUserInputGoodies = userInputGoodies.length > 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="pool_id" value={poolId} />
      <div className="flex gap-2 items-start">
        <select
          name="bracket_id"
          defaultValue={
            currentBracketId && completedBrackets.some((b) => b.id === currentBracketId)
              ? currentBracketId
              : ""
          }
          className="input-field flex-1 cursor-pointer"
        >
          <option value="" disabled>Select a bracket…</option>
          {completedBrackets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending} className="btn-primary shrink-0">
          {isPending ? "Submitting…" : currentBracketId ? "Update" : "Submit"}
        </button>
      </div>

      {hasUserInputGoodies && (
        <div className="rounded-xl border border-card-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-card-border bg-background/50">
            <h3 className="text-sm font-medium text-stone-200">Goody picks</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optional bonus picks for this pool. Submit with your bracket.
            </p>
          </div>
          <div className="p-4 space-y-4">
            {userInputGoodies.map((pg) => {
              const key = pg.goody_types?.key ?? "";
              const name = pg.goody_types?.name ?? "Goody";
              if (key === "first_conference_out") {
                const options =
                  (pg.goody_types?.config?.conference_options as string[] | undefined) ??
                  [...ELITE_CONFERENCES];
                return (
                  <div key={pg.id} className="space-y-1.5">
                    <label
                      htmlFor={`goody_${pg.goody_type_id}`}
                      className="block text-sm font-medium text-stone-300"
                    >
                      {name}
                    </label>
                    <select
                      id={`goody_${pg.goody_type_id}`}
                      name={`goody_${pg.goody_type_id}`}
                      className="input-field w-full"
                      defaultValue={getExistingValue(
                        pg.goody_type_id,
                        existingGoodyAnswers,
                        "conference_key"
                      )}
                    >
                      <option value="">Select conference…</option>
                      {options.map((conf) => (
                        <option key={conf} value={conf}>
                          {conf}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (key === "nit_champion" || key === "dark_horse_champion") {
                return (
                  <div key={pg.id} className="space-y-1.5">
                    <label
                      htmlFor={`goody_${pg.goody_type_id}`}
                      className="block text-sm font-medium text-stone-300"
                    >
                      {name}
                    </label>
                    <select
                      id={`goody_${pg.goody_type_id}`}
                      name={`goody_${pg.goody_type_id}`}
                      className="input-field w-full"
                      defaultValue={getExistingValue(
                        pg.goody_type_id,
                        existingGoodyAnswers,
                        "team_id"
                      )}
                    >
                      <option value="">Select team…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.seed} {t.name} ({t.region})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (key === "biggest_first_round_blowout") {
                return (
                  <div key={pg.id} className="space-y-1.5">
                    <label
                      htmlFor={`goody_${pg.goody_type_id}`}
                      className="block text-sm font-medium text-stone-300"
                    >
                      {name}
                    </label>
                    <select
                      id={`goody_${pg.goody_type_id}`}
                      name={`goody_${pg.goody_type_id}`}
                      className="input-field w-full"
                      defaultValue={getExistingValue(
                        pg.goody_type_id,
                        existingGoodyAnswers,
                        "game_id"
                      )}
                    >
                      <option value="">Select game…</option>
                      {firstRoundGames.map((g) => (
                        <option key={g.id} value={g.id}>
                          {gameLabel(g, teams)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs text-green-400">Bracket submitted!</p>
      )}
    </form>
  );
}
