/**
 * =============================================================================
 *  POST /api/attendance
 *
 *  Persists the final attendance record once all checks have passed.
 *
 *  Body:
 *    {
 *      user_id:          string | null,   // null when face was unknown
 *      user_name:        string | null,
 *      prayer_name:      "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha",
 *      location_status:  "inside" | "outside",
 *      scene_score:      number | null,
 *      scene_passed:     boolean,
 *      face_distance:    number | null,
 *    }
 *
 *  The `timestamp` column is set server-side for consistency.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      user_id?: string | null;
      user_name?: string | null;
      prayer_name?: string;
      location_status?: string;
      scene_score?: number | null;
      scene_passed?: boolean;
      face_distance?: number | null;
    };

    // Minimal validation.
    if (!body.prayer_name || !body.location_status) {
      return NextResponse.json(
        { error: "prayer_name and location_status are required." },
        { status: 400 },
      );
    }

    const client = getServiceClient();

    // The Supabase client does not have generated table types — we suppress
    // the type-check on this insert call since columns are user-defined.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: record, error } = await (client as any)
      .from("attendance")
      .insert({
        user_id: body.user_id ?? null,
        user_name: body.user_name ?? null,
        prayer_name: body.prayer_name,
        location_status: body.location_status,
        scene_score: body.scene_score ?? null,
        scene_passed: body.scene_passed ?? false,
        face_distance: body.face_distance ?? null,
        timestamp: new Date().toISOString(),
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    console.error("[attendance] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}