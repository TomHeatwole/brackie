import { isTestMode } from "./tournament";

export function buildQuerySuffix(
  searchParams: Record<string, string | string[] | undefined>
): string {
  return isTestMode(searchParams) ? "?mode=test" : "";
}
