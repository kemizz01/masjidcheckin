/* =========================================================================
 * MasjidCheckIn — API Helpers (Phase 3 — Real Endpoints)
 *
 * Every function here performs an HTTP POST to the corresponding Next.js
 * Route Handler.  The shape of the response is normalised to match what
 * the frontend UI components expect.
 *
 * USAGE (inside a client component):
 *   import { recognizeFace } from "@/lib/api";
 *
 *   const result = await recognizeFace(base64image);
 *   if (result.matched) { showSuccess(result.name); }
 * ========================================================================= */

import { MOCK_AI } from "./config";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FaceResult {
  matched: boolean;
  name: string | null;
  distance: number | null;
  user: {
    id: string;
    name: string;
    class_name?: string | null;
    archive_photo_url?: string;
  } | null;
}

export interface SceneResult {
  passed: boolean;
  score: number | null;
  label: string | null;
}

export interface AttendancePayload {
  user_id?: string | null;
  user_name?: string | null;
  prayer_name: string;
  location_status: string;
  scene_score: number | null;
  scene_passed: boolean;
  face_distance: number | null;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `API ${url} returned ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) msg += `: ${err.error}`;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Keep a tiny mock counter for demo-only fallback (not used when MOCK_AI=false).
let mockFaceFrames = 0;
let mockSceneFrames = 0;

/* ================================================================== */
/*  recognizeFace                                                      */
/* ================================================================== */

/**
 * Sends a face snapshot to `/api/recognize-face` and normalises the
 * response into the `FaceResult` shape used by the attendance flow.
 */
export async function recognizeFace(image: string): Promise<FaceResult> {
  // ------------------------------------------------------------------
  // 🧪 MOCK MODE (only used when MOCK_AI = true in config.ts)
  // ------------------------------------------------------------------
  if (MOCK_AI) {
    await sleep(950);
    mockFaceFrames += 1;
    if (mockFaceFrames < 3) return { matched: false, name: null, distance: 0.59, user: null };
    return {
      matched: true,
      name: "Ahmad Fauzi",
      distance: 0.31,
      user: { id: "mock-u1", name: "Ahmad Fauzi" },
    };
  }

  // ------------------------------------------------------------------
  // 🔗 REAL MODE
  // ------------------------------------------------------------------
  const data = await postJSON<{
    matched: boolean;
    user?: {
      id: string;
      name: string;
      class_name?: string | null;
      archive_photo_url?: string;
    } | null;
    distance?: number | null;
  }>("/api/recognize-face", { image });

  return {
    matched: data.matched ?? false,
    name: data.user?.name ?? null,
    distance: data.distance ?? null,
    user: data.user ?? null,
  };
}

/* ================================================================== */
/*  verifyScene                                                        */
/* ================================================================== */

/**
 * Sends a room snapshot to `/api/verify-scene` and normalises the
 * response into the `SceneResult` shape.
 */
export async function verifyScene(image: string): Promise<SceneResult> {
  if (MOCK_AI) {
    await sleep(950);
    mockSceneFrames += 1;
    if (mockSceneFrames < 2) return { passed: false, score: 0.42, label: null };
    return { passed: true, score: 0.87, label: "prayer_hall" };
  }

  const data = await postJSON<{
    pass: boolean;
    score?: number | null;
    label?: string | null;
  }>("/api/verify-scene", { image });

  return {
    passed: data.pass ?? false,
    score: data.score ?? null,
    label: data.label ?? null,
  };
}

/* ================================================================== */
/*  saveAttendance                                                     */
/* ================================================================== */

/**
 * Persists the final attendance log to Supabase via `/api/attendance`.
 * Called once all three checks (GPS → Face → Scene) have passed.
 */
export async function saveAttendance(
  payload: AttendancePayload,
): Promise<{ success: boolean }> {
  if (MOCK_AI) {
    await sleep(400);
    console.log("[mock] attendance saved:", payload);
    return { success: true };
  }

  return postJSON<{ success: boolean }>("/api/attendance", payload);
}

/* ================================================================== */
/*  registerFace  (Admin panel)                                        */
/* ================================================================== */

/**
 * Registers a new face from the admin panel.
 * POST /api/register-face  { image, name, className }
 */
export async function registerFace(
  image: string,
  name: string,
  className: string,
): Promise<{
  success: boolean;
  user: {
    id: string;
    name: string;
    class_name?: string | null;
    archive_photo_url: string;
  };
}> {
  return postJSON("/api/register-face", { image, name, className });
}

/* ================================================================== */
/*  Counter reset (still available for the attend flow)                */
/* ================================================================== */

export function resetMockCounters(): void {
  mockFaceFrames = 0;
  mockSceneFrames = 0;
}