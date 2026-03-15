#!/usr/bin/env python3
"""
Extract bracket team names from a saved ESPN Tournament Challenge bracket HTML.
Reads scrape/espn_brackie_2.html if non-empty, else scrape/espn_brackie.html.
Outputs JSON array of { region, seed, name } to stdout (and optionally to a file).
"""
from pathlib import Path
import re
import json
import html
import sys


def extract_teams(html_text: str) -> list[dict]:
    """Parse BracketCell__Rank / BracketCell__Name pairs from ESPN bracket HTML."""
    cells = re.findall(
        r"BracketCell__Rank[^>]*>(\d+)</div>\s*<div[^>]*BracketCell__Name[^>]*>([^<]+)</div>",
        html_text,
    )
    seen = set()
    ordered = []
    for seed_str, name in cells:
        seed = int(seed_str)
        name = html.unescape(name.strip())
        key = (seed, name)
        if key not in seen and len(ordered) < 64:
            seen.add(key)
            ordered.append({"seed": seed, "name": name})
    regions = ["East"] * 16 + ["West"] * 16 + ["South"] * 16 + ["Midwest"] * 16
    return [
        {"region": regions[i], "seed": t["seed"], "name": t["name"]}
        for i, t in enumerate(ordered)
    ]


def main() -> None:
    base = Path(__file__).resolve().parent
    path2 = base / "espn_brackie_2.html"
    path1 = base / "espn_brackie.html"
    if path2.exists() and path2.stat().st_size > 0:
        source = path2
    else:
        source = path1
    if not source.exists() or source.stat().st_size == 0:
        print("No HTML file found (espn_brackie_2.html or espn_brackie.html).", file=sys.stderr)
        sys.exit(1)
    text = source.read_text()
    teams = extract_teams(text)
    out = json.dumps(teams, indent=2)
    print(out)
    if "--write" in sys.argv:
        out_path = base / "espn_teams.json"
        out_path.write_text(out)
        print(f"Wrote {len(teams)} teams to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
