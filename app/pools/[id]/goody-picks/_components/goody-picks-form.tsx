"use client";

import { useFormStatus } from "react-dom";
import { saveGoodyPicksAction } from "../actions";
import {
  Team,
  TournamentGame,
  ELITE_CONFERENCES,
} from "@/lib/types";
import ScoringTooltip from "@/app/_components/scoring-tooltip";
import type { PoolGoodyWithType } from "@/lib/pools";
import type { PoolBracketGoodyAnswer } from "@/lib/types";

interface Props {
  poolId: string;
  modeParam: string;
  userInputGoodies: PoolGoodyWithType[];
  existingGoodyAnswers: PoolBracketGoodyAnswer[];
  teams: Team[];
  firstRoundGames: TournamentGame[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base font-medium">
      {pending ? "Saving…" : "Save goodie picks"}
    </button>
  );
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
  if (key === "nit_matchup" && "nit_matchup" in a.value) {
    return String(a.value.nit_matchup);
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

export default function GoodyPicksForm({
  poolId,
  modeParam,
  userInputGoodies,
  existingGoodyAnswers,
  teams,
  firstRoundGames,
}: Props) {
  return (
    <form action={saveGoodyPicksAction} className="flex flex-col gap-6">
      <input type="hidden" name="pool_id" value={poolId} />
      <input type="hidden" name="mode_param" value={modeParam} />
      <div className="card rounded-xl border border-card-border overflow-hidden">
        <div className="px-4 py-4 border-b border-card-border bg-background/50">
          <h2 className="text-base font-medium text-stone-200">Goodie picks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Optional bonus picks for this pool. Fill these out to be eligible for goodie points.
          </p>
        </div>
        <div className="p-4 space-y-5">
          {userInputGoodies.map((pg) => {
            const key = pg.goody_types?.key ?? "";
            const name = pg.goody_types?.name ?? "Goodie";
            if (key === "first_conference_out") {
              const options =
                (pg.goody_types?.config?.conference_options as string[] | undefined) ??
                [...ELITE_CONFERENCES];
              return (
                <div key={pg.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`goody_${pg.goody_type_id}`}
                      className="block text-sm font-medium text-stone-300"
                    >
                      {name}
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {pg.points} pts
                    </span>
                  </div>
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
            if (key === "nit_champion") {
              const nitOptions =
                (pg.goody_types?.config?.nit_options as string[] | undefined) ?? [];
              return (
                <div key={pg.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`goody_${pg.goody_type_id}`}
                      className="block text-sm font-medium text-stone-300"
                    >
                      {name}
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {pg.points} pts
                    </span>
                  </div>
                  <select
                    id={`goody_${pg.goody_type_id}`}
                    name={`goody_${pg.goody_type_id}`}
                    className="input-field w-full"
                    defaultValue={getExistingValue(
                      pg.goody_type_id,
                      existingGoodyAnswers,
                      "nit_matchup"
                    )}
                  >
                    <option value="">Select team…</option>
                    {nitOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            if (key === "dark_horse_champion") {
              return (
                <div key={pg.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`goody_${pg.goody_type_id}`}
                        className="block text-sm font-medium text-stone-300"
                      >
                        {name}
                      </label>
                      <ScoringTooltip
                        variant="goodies"
                        content={
                          <>
                            Your Dark Horse must be at least a 3-seed (seeds 3–16).
                            You may gamble on a 1- or 2-seed, but if anyone else in
                            the pool has that team as their main champion, your
                            Dark Horse pick becomes ineligible. To stay safe, stick
                            to seeds 3–16. When Dark Horse uses bracket-upset
                            scoring and multiple players hit it, those players{" "}
                            <span className="font-semibold">split</span> the Dark
                            Horse Goodie points.
                          </>
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {pg.points} pts
                    </span>
                  </div>
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
                <div key={pg.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`goody_${pg.goody_type_id}`}
                      className="block text-sm font-medium text-stone-300"
                    >
                      {name}
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {pg.points} pts
                    </span>
                  </div>
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

      <SubmitButton />
    </form>
  );
}
