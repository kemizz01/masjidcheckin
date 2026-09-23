/* =========================================================================
 * MasjidCheckIn — App-wide Configuration
 *
 * All values that might change per deployment (mosque name, coordinates,
 * geofence radius, feature flags) are centralised here so they are easy to
 * find and update.
 * ========================================================================= */

export const MOSQUE = {
  /** Display name shown in the header and throughout the UI. */
  name: "Masjid Al-Ikhlas",

  /**
   * Centre-point of the geofence.  These are placeholder coordinates
   * (Jakarta city centre).  Replace with your real mosque location.
   */
  latitude: -6.2088,
  longitude: 106.8456,

  /** Maximum allowed distance (in metres) from the mosque. */
  geofenceRadiusMeters: 150,
} as const;

/**
 * MOCK_AI — Feature Flag
 *
 * While `true`, `lib/api.ts` returns simulated responses instead of
 * calling the real `/api/recognize-face` and `/api/verify-scene` endpoints.
 * This lets you develop and demo the full UI flow before Phase 3 back-end
 * Route Handlers are in place.
 *
 * Set to `false` once the `/api` routes are deployed.
 */
export const MOCK_AI = false;

/** Base URL for the app (used for prefetch / metadata). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* ------------------------------------------------------------------ */
/*  Supabase Storage buckets                                           */
/* ------------------------------------------------------------------ */

/** Where raw face registration snapshots are archived (dual-storage). */
export const FACES_BUCKET = "maqam-faces-archive";

/** Where scene reference photos (valid mosque / blacklisted areas) live. */
export const SCENES_BUCKET = "maqam-scene-references";