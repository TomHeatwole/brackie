/**
 * Format a user's display name from first and last name.
 * Returns "First Last", or a single name if only one is set, or empty string if neither.
 */
export function formatUserDisplayName(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return "";
}
