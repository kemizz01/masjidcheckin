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
  InvalidImageError,
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
    let incomingDescriptor: Float32Array | null = null;
    try {
      incomingDescriptor = await extractFaceDescriptor(body.image);
    } catch (err: any) {
      if (err instanceof InvalidImageError || err?.name === "InvalidImageError") {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

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
    let users: any[] | null = null;
    const { data, error } = await client
      .from("users")
      .select("id, name, class_name, face_descriptor, archive_photo_url");

    if (error) {
      // Tolerate a database that is missing the optional `class_name` column.
      if (/class_name/i.test(error.message ?? "")) {
        const retry = await client
          .from("users")
          .select("id, name, face_descriptor, archive_photo_url");
        if (retry.error) throw retry.error;
        users = retry.data as any[];
      } else {
        throw error;
      }
    } else {
      users = data as any[];
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        {
          matched: false,
          user: null,
          distance: null,
          reason: "no_users",
          totalUsers: 0,
        },
        { status: 200 },
      );
    }

    // ---------------------------------------------------------------------
    // 4. Find the closest descriptor
    // ---------------------------------------------------------------------
    let bestMatch: { user: any; distance: number } | null = null;
    let comparable = 0;

    for (const user of users) {
      if (!user.face_descriptor) continue; // skip users without a descriptor

      let candidate: Float32Array;
      try {
        candidate = parseDescriptor(user.face_descriptor);
      } catch (parseErr: any) {
        console.warn(
          `[recognize-face] Skipping user ${user.id}: ${parseErr?.message}`,
        );
        continue;
      }
      if (candidate.length === 0) continue;
      comparable++;

      const distance = euclideanDistance(incomingDescriptor, candidate);

      if (bestMatch === null || distance < bestMatch.distance) {
        bestMatch = { user, distance };
      }
    }

    // No user has a usable descriptor yet
    if (comparable === 0) {
      return NextResponse.json(
        {
          matched: false,
          user: null,
          distance: null,
          reason: "no_descriptors",
          totalUsers: users.length,
        },
        { status: 200 },
      );
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
      reason: "no_match",
      totalUsers: users.length,
    });
  } catch (err: any) {
    console.error("[recognize-face] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}