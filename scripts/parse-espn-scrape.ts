/**
 * Parse ESPN bracket scrape HTML and write public/2026-teams.json.
 * Usage: pnpm tsx scripts/parse-espn-scrape.ts [path-to-html]
 * Default path: scrape/espn_brackie_2.html
 */

import * as fs from "fs";
import * as path from "path";

// Output order (and DB order): East, West, South, Midwest
const REGIONS = ["East", "West", "South", "Midwest"] as const;
// Tournament Challenge page shows regions in this order (so slot 16–31 = South, 32–47 = West)
const REGIONS_TC = ["East", "South", "West", "Midwest"] as const;
// Standard bracket order: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const SEED_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
const LOGO_BASE = "https://a.espncdn.com/i/teamlogos/ncaa/500";

// First Four play-in slots: these get "Play In" and no logo; the scrape has 60 teams for the other 60 slots
const PLAY_IN_SLOTS: Set<string> = new Set([
  "South-16",
  "Midwest-16",
  "West-11",
  "Midwest-11",
]);

function isPlayIn(region: string, seed: number): boolean {
  return PLAY_IN_SLOTS.has(`${region}-${seed}`);
}

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

  const FALLBACK_LOGO_IDS = ["251", "152", "193", "2567"];
  let first64Logos: string[];
  let first64Names: string[];

  // Tournament Challenge (500-dark): logo and name are in the same block — pair by "logo URL then next </label>"
  const darkLogoRe = /teamlogos\/ncaa\/500-dark\/(\d+)\.png/g;
  const darkPairs: { id: string; name: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = darkLogoRe.exec(html)) !== null) {
    const id = m[1];
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 800);
    const labelMatch = after.match(/>([A-Za-z0-9 .'&]+)<\/label>/);
    const name = labelMatch
      ? labelMatch[1].replace(/&amp;/g, "&").trim()
      : "TBD";
    if (name.length > 0 && name.length < 50) darkPairs.push({ id, name });
  }

  const usedTcPairing = darkPairs.length >= 32;

  if (usedTcPairing) {
    // TC scrape: 60 teams; 4 slots are play-ins (South 16, Midwest 16, West 11, Midwest 11)
    first64Logos = darkPairs.map((p) => p.id);
    first64Names = darkPairs.map((p) => p.name);
    // no padding — we have exactly 60 for the 60 non–play-in slots
  } else {
    // Original bracket (500): logos and names in document order
    const logoRe = /teamlogos\/ncaa\/500\/(\d+)\.png/g;
    const logoIds: string[] = [];
    while ((m = logoRe.exec(html)) !== null) logoIds.push(m[1]);

    const names: string[] = [];
    const nameRe1 = /BracketCell__Name truncate">([^<]+)/g;
    while ((m = nameRe1.exec(html)) !== null) {
      names.push(m[1].replace(/&amp;/g, "&"));
    }

    first64Logos = logoIds.slice(0, 64);
    first64Names = names.slice(0, 64);
    while (first64Logos.length < 64) {
      first64Logos.push(FALLBACK_LOGO_IDS[first64Logos.length - 60] ?? "12");
    }
    while (first64Names.length < 64) {
      first64Names.push("TBD");
    }
  }

  // Use standard seed order for both: TC page lists teams in same order (4 before 3, etc.)
  const seedOrder = SEED_ORDER;

  type Entry = { region: string; seed: number; name: string; icon_url: string | null };
  const entries: Entry[] = [];

  if (usedTcPairing) {
    // TC: 60 teams in page order = East (16), South (16), West (16), Midwest (16); 4 play-in slots get "Play In"
    // Page order uses REGIONS_TC so slot 16–31 = South, 32–47 = West
    let teamIndex = 0;
    const entriesBySlot: Entry[] = [];
    for (let slot = 0; slot < 64; slot++) {
      const region = REGIONS_TC[Math.floor(slot / 16)];
      const seed = seedOrder[slot % 16];
      if (isPlayIn(region, seed)) {
        entriesBySlot[slot] = { region, seed, name: "Play In", icon_url: null };
      } else {
        entriesBySlot[slot] = {
          region,
          seed,
          name: first64Names[teamIndex],
          icon_url: `${LOGO_BASE}/${first64Logos[teamIndex]}.png`,
        };
        teamIndex++;
      }
    }
    // Output in standard REGIONS order (East, West, South, Midwest) for consistent JSON / DB
    for (const region of REGIONS) {
      for (let seed = 1; seed <= 16; seed++) {
        const bracketPos = seedOrder.indexOf(seed);
        const slot = REGIONS_TC.indexOf(region) * 16 + bracketPos;
        entries.push(entriesBySlot[slot]);
      }
    }
  } else {
    const slotToEntry = (slot: number): Entry => {
      const region = REGIONS[Math.floor(slot / 16)];
      const seed = seedOrder[slot % 16];
      if (isPlayIn(region, seed)) {
        return { region, seed, name: "Play In", icon_url: null };
      }
      return {
        region,
        seed,
        name: first64Names[slot],
        icon_url: `${LOGO_BASE}/${first64Logos[slot]}.png`,
      };
    };
    for (const region of REGIONS) {
      for (let seed = 1; seed <= 16; seed++) {
        const bracketPos = seedOrder.indexOf(seed);
        const slot = REGIONS.indexOf(region) * 16 + bracketPos;
        entries.push(slotToEntry(slot));
      }
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(entries, null, 2) + "\n", "utf-8");
  console.log("Wrote", outPath);
  const nonTbd = entries.filter((e) => e.name !== "TBD" && e.name !== "Play In").length;
  const playInCount = entries.filter((e) => e.name === "Play In").length;
  console.log(`${nonTbd}/64 teams with names; ${playInCount} play-in slots.`);
}

main();
