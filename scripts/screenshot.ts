import { chromium, type Page, type BrowserContext } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = "http://localhost:4000";
const AUTH_STATE_PATH = path.join(__dirname, "..", "auth", "state.json");
const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");

interface Action {
  type: "click" | "fill" | "select" | "hover" | "wait" | "screenshot" | "press";
  selector?: string;
  value?: string;
  key?: string;
  name?: string;
  timeout?: number;
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      parsed[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return parsed;
}

async function runAction(page: Page, action: Action, screenshotDir: string) {
  switch (action.type) {
    case "click":
      if (!action.selector) throw new Error("click requires a selector");
      await page.locator(action.selector).click();
      break;
    case "fill":
      if (!action.selector || action.value === undefined)
        throw new Error("fill requires selector and value");
      await page.locator(action.selector).fill(action.value);
      break;
    case "select":
      if (!action.selector || action.value === undefined)
        throw new Error("select requires selector and value");
      await page.locator(action.selector).selectOption(action.value);
      break;
    case "hover":
      if (!action.selector) throw new Error("hover requires a selector");
      await page.locator(action.selector).hover();
      break;
    case "press":
      if (!action.key) throw new Error("press requires a key");
      await page.keyboard.press(action.key);
      break;
    case "wait":
      await page.waitForTimeout(action.timeout ?? 1000);
      break;
    case "screenshot": {
      const name = action.name ?? `step-${Date.now()}`;
      const filePath = path.join(screenshotDir, `${name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`  Saved: ${path.relative(process.cwd(), filePath)}`);
      break;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const pagePath = args.path ?? "/";
  const screenshotName = args.name ?? (pagePath.replace(/\//g, "-").replace(/^-/, "") || "home");
  const actionsJson = args.actions;
  const fullPage = args.fullpage !== "false";
  const width = parseInt(args.width ?? "1280", 10);
  const height = parseInt(args.height ?? "720", 10);

  if (!fs.existsSync(AUTH_STATE_PATH)) {
    console.error(
      "\n  No auth state found. Run `pnpm save-auth` first to log in.\n"
    );
    process.exit(1);
  }

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    storageState: AUTH_STATE_PATH,
    viewport: { width, height },
  });

  const page = await context.newPage();

  const url = `${BASE_URL}${pagePath}`;
  console.log(`\n  Navigating to ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });

  // If we got redirected to login when we didn't intend to go there, auth has expired
  const intendedLogin = pagePath === "/login" || pagePath.startsWith("/login?");
  if (!intendedLogin && page.url().includes("/login")) {
    console.error(
      "\n  Session expired — redirected to /login. Run `pnpm save-auth` again.\n"
    );
    await browser.close();
    process.exit(1);
  }

  if (actionsJson) {
    let actions: Action[];
    try {
      actions = JSON.parse(actionsJson);
    } catch {
      console.error("  Invalid --actions JSON");
      await browser.close();
      process.exit(1);
    }

    for (const action of actions) {
      console.log(`  Action: ${action.type}${action.selector ? ` → ${action.selector}` : ""}`);
      await runAction(page, action, SCREENSHOTS_DIR);
    }
  }

  // Always take a final screenshot
  const finalPath = path.join(SCREENSHOTS_DIR, `${screenshotName}.png`);
  await page.screenshot({ path: finalPath, fullPage });
  console.log(`  Saved: ${path.relative(process.cwd(), finalPath)}`);

  await browser.close();
  console.log("  Done.\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
