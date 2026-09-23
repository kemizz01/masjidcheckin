/**
 * =============================================================================
 *  GET /api/logs
 *
 *  Returns recent attendance logs, joined with the `users` table so the
 *  admin dashboard can show the attendee's name and archive photo.
 *
 *  Query params:
 *    limit  — number of rows (default 50, max 200)
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const client = getServiceClient();

    // Join attendance → users via the `user_id` foreign key.
    // Supabase resolves `users(id, name, archive_photo_url)` into a nested object.
    const { data: logs, error } = await client
      .from("attendance")
      .select(
        "id, prayer_name, timestamp, location_status, scene_score, scene_passed, face_distance, user_id, users(id, name, archive_photo_url)",
      )
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ logs: logs ?? [] });
  } catch (err: any) {
    console.error("[logs] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}