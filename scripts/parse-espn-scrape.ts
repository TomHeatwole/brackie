/**
 * Parse ESPN bracket scrape HTML and write public/2026-teams.json.
 * Usage: pnpm tsx scripts/parse-espn-scrape.ts [path-to-html]
 * Default path: scrape/espn_brackie_2.html
 */

import * as fs from "fs";
import * as path from "path";

const REGIONS = ["East", "West", "South", "Midwest"] as const;
// Bracket order per region: matchup 0 = seed 1 vs 16, 1 = 8 vs 9, ...
const SEED_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
const LOGO_BASE = "https://a.espncdn.com/i/teamlogos/ncaa/500";

function main() {
  const htmlPath =
    process.argv[2] || path.join(process.cwd(), "scrape", "espn_brackie_2.html");
  const outPath = path.join(process.cwd(), "public", "2026-teams.json");

  if (!fs.existsSync(htmlPath)) {
    console.error("File not found:", htmlPath);
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  if (html.length === 0) {
    console.error("File is empty. Save the scrape first.");
    process.exit(1);
  }

  const logoRe = /teamlogos\/ncaa\/500\/(\d+)\.png/g;
  const nameRe = /BracketCell__Name truncate">([^<]+)/g;

  const logoIds: string[] = [];
  const names: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = logoRe.exec(html)) !== null) logoIds.push(m[1]);
  while ((m = nameRe.exec(html)) !== null) {
    names.push(m[1].replace(/&amp;/g, "&"));
  }

  if (logoIds.length < 64 || names.length < 64) {
    console.error(
      `Need at least 64 logos and 64 names; got ${logoIds.length} logos and ${names.length} names.`
    );
    process.exit(1);
  }

  const first64Logos = logoIds.slice(0, 64);
  const first64Names = names.slice(0, 64);

  // Bracket order: slot 0-15 East (seeds 1,16,8,9,...), 16-31 West, 32-47 South, 48-63 Midwest
  const slotToEntry = (slot: number) => ({
    region: REGIONS[Math.floor(slot / 16)],
    seed: SEED_ORDER[slot % 16],
    name: first64Names[slot],
    icon_url: `${LOGO_BASE}/${first64Logos[slot]}.png`,
  });

  // Output order: East 1..16, West 1..16, South 1..16, Midwest 1..16 (for consistent JSON)
  const entries: { region: string; seed: number; name: string; icon_url: string }[] = [];
  for (const region of REGIONS) {
    for (let seed = 1; seed <= 16; seed++) {
      const bracketPos = SEED_ORDER.indexOf(seed);
      const regionIndex = REGIONS.indexOf(region);
      const slot = regionIndex * 16 + bracketPos;
      entries.push(slotToEntry(slot));
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(entries, null, 2) + "\n", "utf-8");
  console.log("Wrote", outPath);
  const nonTbd = entries.filter((e) => e.name !== "TBD").length;
  console.log(`${nonTbd}/64 teams have non-TBD names.`);
}

main();
