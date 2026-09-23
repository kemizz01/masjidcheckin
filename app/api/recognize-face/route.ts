/**
 * =============================================================================
 *  POST /api/recognize-face
 *
 *  Attendance-time face matching.
 *
 *  Pipeline:
 *    1. Decode the incoming Base64 image.
 *    2. Run face detection + descriptor extraction (128-d).
 *    3. Fetch ALL registered users' descriptors from Supabase.
 *    4. Compute Euclidean distance to each descriptor.
 *    5. If the minimum distance < 0.45 → MATCH, return the user.
 *       Otherwise → "Unknown".
 *
 *  Body:  { image: "data:image/jpeg;base64,…" }
 *  Returns: { matched: true, user: { id, name }, distance: 0.32 }
 *           or { matched: false, user: null, distance: null }
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import {
  extractFaceDescriptor,
  euclideanDistance,
  parseDescriptor,
} from "@/lib/ai/face-recognition";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Euclidean-distance threshold for a positive match. */
const MATCH_THRESHOLD = 0.45;

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------------------
    // 1. Parse body
    // ---------------------------------------------------------------------
    const body = (await request.json()) as { image?: string };
    if (!body.image) {
      return NextResponse.json({ error: "Missing 'image'." }, { status: 400 });
    }

    // ---------------------------------------------------------------------
    // 2. Extract the incoming descriptor
    // ---------------------------------------------------------------------
    const incomingDescriptor = await extractFaceDescriptor(body.image);
    if (!incomingDescriptor) {
      return NextResponse.json(
        { matched: false, user: null, distance: null, reason: "no_face" },
        { status: 200 },
      );
    }

    // ---------------------------------------------------------------------
    // 3. Fetch all registered users
    // ---------------------------------------------------------------------
    const client = getServiceClient();
    const { data: users, error } = await client
      .from("users")
      .select("id, name, class_name, face_descriptor, archive_photo_url");

    if (error) throw error;
    if (!users || users.length === 0) {
      return NextResponse.json(
        { matched: false, user: null, distance: null, reason: "no_users" },
        { status: 200 },
      );
    }

    // ---------------------------------------------------------------------
    // 4. Find the closest descriptor
    // ---------------------------------------------------------------------
    let bestMatch: { user: any; distance: number } | null = null;

    for (const user of users) {
      if (!user.face_descriptor) continue; // skip users without a descriptor

      let candidate: Float32Array;
      try {
        candidate = parseDescriptor(user.face_descriptor);
      } catch {
        continue;
      }

      const distance = euclideanDistance(incomingDescriptor, candidate);

      if (bestMatch === null || distance < bestMatch.distance) {
        bestMatch = { user, distance };
      }
    }

    // ---------------------------------------------------------------------
    // 5. Decide
    // ---------------------------------------------------------------------
    if (bestMatch && bestMatch.distance < MATCH_THRESHOLD) {
      return NextResponse.json({
        matched: true,
        user: {
          id: bestMatch.user.id,
          name: bestMatch.user.name,
          class_name: bestMatch.user.class_name ?? null,
          archive_photo_url: bestMatch.user.archive_photo_url,
        },
        distance: bestMatch.distance,
      });
    }

    return NextResponse.json({
      matched: false,
      user: null,
      distance: bestMatch?.distance ?? null,
    });
  } catch (err: any) {
    console.error("[recognize-face] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}