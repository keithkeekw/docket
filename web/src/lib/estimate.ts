/**
 * Estimate formatting from DESIGN §4 examples: "30m", "1h", "1h 30m".
 * Returns null when there is nothing to show.
 */
export function formatEstimate(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;

  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
