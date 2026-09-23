/* =========================================================================
 * MasjidCheckIn — Supabase Client Helpers
 *
 * TWO clients are exported:
 *   `supabase`       → safe for the **browser** (anon key, no admin rights).
 *   `getServiceClient()` → for **server-only** Route Handlers (service role).
 *
 * IMPORTANT: The env vars below are placeholders. Copy `.env.local.example`
 * to `.env.local` and fill in your real Supabase project credentials before
 * Phase 3 (backend APIs that read/write to the DB).
 * ========================================================================= */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Browser (client-side) singleton
// ---------------------------------------------------------------------------
// These use the `NEXT_PUBLIC_` prefix so Next.js inlines them into the client
// bundle at build time. They are **safe** to expose — the anon/public key
// only grants Row-Level-Security (RLS) scoped access.
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser-safe Supabase client.
 * Returns `null` when the required env vars are not set (e.g. during initial
 * local dev before the developer has configured `.env.local`).
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ---------------------------------------------------------------------------
// Server-side admin client (Route Handlers / serverless functions only)
// ---------------------------------------------------------------------------
// The SERVICE_ROLE key bypasses RLS entirely — use it ONLY in server code
// (Route Handlers, Server Components). NEVER prefix it with `NEXT_PUBLIC_` or
// reference it in a client component.
// ---------------------------------------------------------------------------

let _serviceClient: ReturnType<typeof createClient> | null = null;

/**
 * Returns a Supabase client authenticated with the **service role** key.
 * Safe to call inside Next.js Route Handlers and Server Components only.
 *
 * Uses lazy initialisation + module-level cache so the client is only
 * instantiated once per cold start.
 */
export function getServiceClient() {
  if (_serviceClient) return _serviceClient;

  const url = process.env.SUPABASE_URL || supabaseUrl; // fallback for convenience
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[masjidcheckin] SUPRABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in `.env.local` for server-side operations.",
    );
  }

  _serviceClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _serviceClient as any; // untyped — no generated table schema yet
}

// ---------------------------------------------------------------------------
// Storage helpers (server-side)
// ---------------------------------------------------------------------------

/**
 * Uploads a raw Buffer/File to a Supabase Storage bucket and returns the
 * **public URL** of the uploaded object.
 *
 * Used by the "Dual-Storage Registration System":
 *   - `register-face` uploads the raw face snapshot to `maqam-faces-archive`
 *     (so admins can later review it) while the numeric descriptor is stored
 *     in the `users.face_descriptor` column.
 *   - `register-scene` uploads reference photos to `maqam-scene-references`.
 *
 * @param bucket      Storage bucket name
 * @param filePath    Object path inside the bucket (e.g. "faces/abc.jpg")
 * @param buffer      File contents (Buffer/Uint8Array)
 * @param contentType MIME type (e.g. "image/jpeg")
 * @returns The public URL string.
 */
export async function uploadImageToStorage(
  bucket: string,
  filePath: string,
  buffer: Buffer | Uint8Array,
  contentType = "image/jpeg",
): Promise<string> {
  const client = getServiceClient();

  const { error } = await client.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType, upsert: true });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Removes an object from a Supabase Storage bucket (used when deleting a
 * scene reference or user).  Fails silently if the object doesn't exist.
 */
export async function deleteFromStorage(
  bucket: string,
  filePaths: string[],
): Promise<void> {
  const client = getServiceClient();
  await client.storage.from(bucket).remove(filePaths);
}