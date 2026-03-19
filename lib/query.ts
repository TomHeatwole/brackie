import { isTestMode, parseTournamentOverride } from "./tournament";

export function buildQuerySuffix(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const testMode = isTestMode(searchParams);
  const overrideId = parseTournamentOverride(searchParams);
  const parts: string[] = [];

  if (testMode) {
    parts.push("mode=test");
  }

  if (overrideId) {
    parts.push(`tournament_id=${encodeURIComponent(overrideId)}`);
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

