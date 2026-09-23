/**
 * =============================================================================
 *  /api/report
 *
 *  GET → return today's attendance report:
 *         - Per prayer: who attended vs who hasn't
 *         - Summary counts
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const client = getServiceClient();

    // 1. Get all registered users
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, name")
      .order("name", { ascending: true });

    if (usersError) throw usersError;

    // 2. Get today's attendance records (joined with users)
    const startOfDay = `${dateParam}T00:00:00+07:00`;
    const endOfDay = `${dateParam}T23:59:59+07:00`;

    const { data: records, error: recsError } = await client
      .from("attendance")
      .select("id, user_id, user_name, prayer_name, timestamp, face_distance, scene_passed, location_status")
      .gte("timestamp", startOfDay)
      .lte("timestamp", endOfDay)
      .order("timestamp", { ascending: false });

    if (recsError) throw recsError;

    // 3. Get unique prayers that have records today
    const attendedMap = new Map<string, Set<string>>(); // prayer_name → Set<user_id>
    const allRecords: any[] = records || [];

    for (const r of allRecords) {
      const key = (r.user_id || r.user_name || "unknown").toString();
      if (!attendedMap.has(r.prayer_name)) {
        attendedMap.set(r.prayer_name, new Set());
      }
      attendedMap.get(r.prayer_name)!.add(key);
    }

    // 4. Build per-prayer report
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const userList = (users || []).map((u: any) => ({
      id: u.id,
      name: u.name,
    }));

    const prayerReports = prayers.map((prayer) => {
      const attended = attendedMap.get(prayer) || new Set();
      // For anonymous records (no user_id), we count them separately
      const attendedUsers = userList.filter((u: any) => attended.has(u.id));
      const absentUsers = userList.filter((u: any) => !attended.has(u.id));
      const unknownCount = Array.from(attended).filter(
        (key: any) => !userList.some((u: any) => u.id === key)
      ).length;

      return {
        prayer,
        attended: attendedUsers,
        absent: absentUsers,
        attendedCount: attendedUsers.length,
        absentCount: absentUsers.length,
        unknownCount,
        totalUsers: userList.length,
      };
    });

    // 5. Build chronological log
    const logs = allRecords.map((r: any) => ({
      id: r.id,
      prayer_name: r.prayer_name,
      timestamp: r.timestamp,
      user_name: r.user_name || "Unknown",
      face_distance: r.face_distance,
      scene_passed: r.scene_passed,
      location_status: r.location_status,
    }));

    return NextResponse.json({
      date: dateParam,
      totalUsers: userList.length,
      prayers: prayerReports,
      logs,
    });
  } catch (err: any) {
    console.error("[report] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}