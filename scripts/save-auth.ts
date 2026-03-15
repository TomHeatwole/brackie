import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = "http://localhost:4000";
const AUTH_STATE_PATH = path.join(__dirname, "..", "auth", "state.json");
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

async function saveAuth() {
  console.log(`\n  Opening a browser window...`);
  console.log(`  Complete the ENTIRE login flow inside THIS browser window:`);
  console.log(`    1. Submit your email on the login page`);
  console.log(`    2. Open a new tab → go to your email inbox`);
  console.log(`    3. Click the magic link FROM INSIDE this browser`);
  console.log(`  You have 5 minutes.\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);

  try {
    await page.waitForURL(
      (url) => url.origin === BASE_URL && url.pathname !== "/login",
      { timeout: LOGIN_TIMEOUT_MS }
    );
  } catch {
    console.error("  Timed out waiting for login. Try again.");
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(2000);

  const stateDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  await context.storageState({ path: AUTH_STATE_PATH });
  await browser.close();

  console.log(`  Auth state saved to ${path.relative(process.cwd(), AUTH_STATE_PATH)}`);
  console.log("  You can now run: pnpm screenshot\n");
}

saveAuth().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
