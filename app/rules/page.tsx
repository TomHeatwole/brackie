import Navbar from "../_components/navbar";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testMode = params?.mode === "test";
  const modeParam = testMode ? "?mode=test" : "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        activeTab="Rules"
        modeParam={modeParam}
      />
      <main className="pt-20 pb-20 md:pb-8 min-h-screen flex justify-center">
        <div className="w-full max-w-2xl px-4 space-y-8">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-stone-100">Brackie scoring rules</h1>
            <p className="text-sm text-muted-foreground">
              This page explains how scoring works in Brackie pools, including Upset points, Goodies, and the optional Stroke rule.
            </p>
          </header>

          <section className="card p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-stone-200">
              Upset points
            </h2>
            <p className="text-sm text-muted-foreground">
              Upset points only apply if{" "}
              <span className="font-medium text-stone-200">
                Upset multipliers
              </span>{" "}
              are enabled for your pool. Each correct pick is still worth a base
              number of points that depends on the round, but correctly picking
              a lower seed to beat a higher seed can add an extra Upset bonus.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-stone-200">
                  Base points
                </span>{" "}
                are set per round under &quot;Points Per Round&quot; in pool
                settings.
              </li>
              <li>
                When Upset multipliers are on, each round also has an{" "}
                <span className="font-medium text-stone-200">
                  Upset multiplier
                </span>{" "}
                value.
              </li>
              <li>
                For a correct upset pick, your Upset bonus is:
                <span className="ml-1 font-mono text-xs bg-stone-900/70 px-1.5 py-0.5 rounded">
                  Upset multiplier × seed differential
                </span>
                .
              </li>
              <li>
                The{" "}
                <span className="font-medium text-stone-200">
                  seed differential
                </span>{" "}
                is the winning team&apos;s seed minus the seed that would have
                been in that spot if the bracket went all chalk (higher seeds
                always advancing).
              </li>
              <li>
                Example: in the second round, a 13-seed beats a 12-seed in the
                game that is supposed to be the 4-seed&apos;s spot. The seed
                differential is{" "}
                <span className="font-mono text-xs bg-stone-900/70 px-1 py-0.5 rounded">
                  13 − 4 = 9
                </span>
                , so the Upset bonus is{" "}
                <span className="font-mono text-xs bg-stone-900/70 px-1 py-0.5 rounded">
                  9 × Upset multiplier
                </span>
                .
              </li>
              <li>
                If you pick the favorite, or if Upset multipliers are off, you
                just get the base points for that game.
              </li>
            </ul>
          </section>

          <section id="goodies" className="card p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-stone-200">
              Goodies
            </h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-stone-200">Goodies</span> are
              optional bonus scoring categories for each pool. Commissioners
              can turn them on, choose which Goodies to use, set how many
              points they are worth, and optionally enable the Stroke rule on a
              per-goodie basis.
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  Lowest seed to win first round
                </h3>
                <p className="text-sm text-muted-foreground">
                  You earn points for correctly picking the lowest seed that
                  wins at least one game in the first round. Only correctly
                  picking that specific team and game earns this Goody.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  Lowest seed to Sweet 16
                </h3>
                <p className="text-sm text-muted-foreground">
                  You earn points for correctly picking the lowest seed that
                  reaches the Sweet 16. You must have that team advancing to the
                  Sweet 16 in your bracket to get credit.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  Lowest seed to Elite Eight
                </h3>
                <p className="text-sm text-muted-foreground">
                  You earn points for correctly picking the lowest seed that
                  makes it to the Elite Eight. As with other bracket-derived
                  Goodies, you only score if your bracket actually has that team
                  reaching that round.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  Lowest seed to Final Four
                </h3>
                <p className="text-sm text-muted-foreground">
                  You earn points for correctly picking the lowest seed that
                  gets to the Final Four. This rewards correctly backing the
                  deepest Cinderella run into the national semifinals.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  Best region bracket
                </h3>
                <p className="text-sm text-muted-foreground">
                  This Goody goes to the bracket with the most correct picks in
                  a single region. If multiple players tie for the best region,
                  they share this Goody according to the Stroke rule setting for
                  this Goody.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  16-seed bonus
                </h3>
                <p className="text-sm text-muted-foreground">
                  You earn bonus points for each game in which you correctly
                  picked a 16-seed to win. Each correct 16-over-1 (or later 16
                  seed win, if it happens) pays out the configured number of
                  points.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  NIT champion
                </h3>
                <p className="text-sm text-muted-foreground">
                  Before the tournament, you pick an NIT champion from the
                  provided list of options. If your pick wins the NIT, you earn
                  the NIT champion Goody points.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  Biggest first round blowout
                </h3>
                <p className="text-sm text-muted-foreground">
                  You try to predict the first round game with the largest
                  margin of victory. If the game you picked ends up having the
                  biggest blowout margin, you earn this Goody.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  First conference out
                </h3>
                <p className="text-sm text-muted-foreground">
                  You pick which elite conference (ACC, SEC, Big Ten, Big
                  Twelve, or Big East) will be the first to have all of its
                  teams eliminated from the tournament. If your conference is
                  the first to go out, you earn the configured points or the
                  conference-multiplier scoring chosen for this Goody.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-200">
                  Dark Horse National Champion
                </h3>
                <p className="text-sm text-muted-foreground">
                  This is your second, &quot;dark horse&quot; national champion
                  pick. If your dark horse wins the national title, you earn
                  this Goody based either on fixed points or on the same score a
                  bracket would receive for correctly picking the real
                  champion, depending on the scoring mode set by the
                  commissioner. When Dark Horse is using bracket-upset scoring
                  and multiple players hit it, those players <span className="font-semibold">split</span> the
                  Dark Horse points; there is no &quot;second-closest&quot; Dark
                  Horse winner.
                </p>
              </div>
            </div>
          </section>

          <section className="card p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-stone-200">
              Stroke rule
            </h2>
            <p className="text-sm text-muted-foreground">
              For some Goodies, commissioners can enable an additional{" "}
              <span className="font-medium text-stone-200">stroke rule</span>.
              When the Stroke rule is on for a Goody, it controls how those
              Goody points are awarded when nobody hits the exact result.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                If at least one player gets the Goody exactly right (for
                example, correctly picking the exact lowest seed that wins in
                the first round), each of those players earns the full Goody
                points.
              </li>
              <li>
                If nobody gets the exact result, the points for that Goody go to
                whoever came closest, based on the same seed-differential idea
                used for Upsets.
              </li>
              <li>
                When multiple players are tied for &quot;closest&quot;, they{" "}
                <span className="font-medium text-stone-200">split</span> the
                Goody points. For example, if a 15-seed beats a 2-seed in the
                first round and nobody had that exact 15-over-2, the points for
                &quot;lowest seed to win first round&quot; would go to the next
                closest correct picks.
              </li>
              <li>
                In that example, if three players correctly had a 14-seed over a
                3-seed as their lowest first-round upset, those three players
                would split the Goody points equally. If instead those same
                three players had correctly picked the 15-over-2, each of them
                would receive the full Goody points.
              </li>
              <li>
                If the Stroke rule is off for a Goody, that Goody simply pays
                out its points normally when it is hit and does not reassign or
                split points when nobody has the exact result.
              </li>
              <li>
                For the Dark Horse National Champion Goody, when it is using
                bracket-upset scoring, Dark Horse points are{" "}
                <span className="font-medium text-stone-200">split by default</span>{" "}
                among all players who correctly picked the Dark Horse champion.
                There is no &quot;second-closest&quot; Dark Horse winner — if
                nobody hits the Dark Horse exactly, the Dark Horse Goody does
                not roll down to a next-best pick.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

