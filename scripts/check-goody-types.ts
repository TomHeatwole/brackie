/**
 * Verify goodie types data in the database (goody_types table).
 * Run: pnpm tsx scripts/check-goody-types.ts
 * Uses .env.local for NEXT_PUBLIC_SB_URL and NEXT_PUBLIC_SB_PUBLIC_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn(".env.local not found; using process.env");
    return;
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const value = m[2].replace(/^["']|["']$/g, "").trim();
      process.env[m[1]] = value;
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SB_URL;
const key = process.env.NEXT_PUBLIC_SB_PUBLIC_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SB_URL or NEXT_PUBLIC_SB_PUBLIC_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log("Querying goody_types table...\n");

  const { data, error } = await supabase
    .from("goody_types")
    .select("id, key, name, input_type")
    .order("name");

  if (error) {
    console.error("Error:", error.message);
    console.error("Details:", error.details);
    console.error("Code:", error.code);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No rows in goody_types. Table exists but is empty.");
    console.log("Run the seed migration: supabase/migrations/20250315000004_seed_goody_types.sql");
    process.exit(1);
  }

  console.log(`Found ${data.length} goodie type(s):\n`);
  data.forEach((row: { key: string; name: string; input_type: string }) => {
    console.log(`  - ${row.key}: ${row.name} (${row.input_type})`);
  });
  console.log("\nGoodie data exists in the DB. If the app still shows 'no goodies', check RLS for goody_types.");
}

main();
