/* =========================================================================
 * MasjidCheckIn — General Utilities
 * ========================================================================= */

/**
 * Tiny `classNames` builder — joins truthy values with a space.
 * Equivalent to the pattern `clsx` or `cn` from popular libraries,
 * but zero-dependency.
 *
 * @example cn("flex", isActive && "text-gold", "p-2") → "flex text-gold p-2"
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Haversine formula — returns the great-circle distance between two
 * geographic coordinates in **metres**.
 *
 * Used on the client to validate whether the user is inside the
 * geofence radius around the mosque.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000; // Earth's mean radius in metres
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Formats a distance in metres into a human-readable string.
 *
 * @example formatDistanceMeters(23)   → "23 m"
 * @example formatDistanceMeters(1200) → "1.2 km"
 */
export function formatDistanceMeters(meters: number | null): string {
  if (meters === null) return "—";
  if (meters < 1_000) return `${Math.round(meters)} m`;
  return `${(meters / 1_000).toFixed(1)} km`;
}

/**
 * Pads a number to two digits (for clock display).
 *
 * @example pad(5) → "05"
 */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}