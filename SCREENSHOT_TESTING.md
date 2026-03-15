# Screenshot Testing with Playwright

This project includes a Playwright-based screenshot tool that lets you visually verify UI changes by capturing authenticated page screenshots from `localhost:4000`.

## Setup (one-time)

1. Install Playwright browsers if you haven't already:

```bash
pnpm exec playwright install chromium
```

2. Save an authenticated session:

```bash
pnpm save-auth
```

A Chrome window will open to `localhost:4000/login`. Complete the login flow **inside this browser window**:

- Enter your email and click "Send Login Link"
- Open a new tab (Cmd+T / Ctrl+T), go to your email inbox
- Copy the magic link URL and paste it into this browser's address bar
- Once you land on the authenticated homepage, the script saves the session and closes

This creates `auth/state.json` which is gitignored. You only need to re-run this when your session expires (the screenshot script will tell you if it has).

## Taking screenshots

Make sure the dev server is running (`pnpm dev -p 4000`), then:

```bash
# Screenshot the homepage
pnpm screenshot

# Screenshot a specific route
pnpm screenshot --path /brackets/create

# Custom filename (saved as screenshots/<name>.png)
pnpm screenshot --path /brackets --name brackets-list

# Custom viewport size (default: 1280x720)
pnpm screenshot --path / --width 375 --height 812
```

Screenshots are saved to the `screenshots/` directory (gitignored).

## Interacting with the page before screenshotting

Use `--actions` with a JSON array of steps to click, type, hover, etc. before the final screenshot:

```bash
pnpm screenshot --path /brackets/create --actions '[
  {"type": "fill", "selector": "input[name=bracket_name]", "value": "My 2026 Bracket"},
  {"type": "screenshot", "name": "form-filled"},
  {"type": "click", "selector": "button[type=submit]"},
  {"type": "wait", "timeout": 2000},
  {"type": "screenshot", "name": "after-submit"}
]'
```

### Available action types

| Type         | Required fields          | Description                          |
|--------------|--------------------------|--------------------------------------|
| `click`      | `selector`               | Click an element                     |
| `fill`       | `selector`, `value`      | Clear an input and type a value      |
| `select`     | `selector`, `value`      | Select a dropdown option by value    |
| `hover`      | `selector`               | Hover over an element                |
| `press`      | `key`                    | Press a keyboard key (e.g. `Enter`)  |
| `wait`       | `timeout` (ms, optional) | Wait for a duration (default 1000ms) |
| `screenshot` | `name` (optional)        | Take an intermediate screenshot      |

A final screenshot is always taken at the end regardless of actions.

## For AI agents

If you are an AI agent working on this codebase:

1. After making UI changes, run `pnpm screenshot --path <route>` to capture the result.
2. Read the PNG file from `screenshots/` to visually verify the change looks correct.
3. If the screenshot script reports "Session expired", ask the user to run `pnpm save-auth`.
