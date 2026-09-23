/**
 * =============================================================================
 *  /api/report
 *
 *  GET → return a detailed attendance report for a given date.
 *
 *  Response structure:
 *    - date           The date being reported
 *    - prayers        Ordered list of prayer names
 *    - users          Per-user attendance matrix (row per user, cell per prayer)
 *    - classes        Per-class roll-up (total, present, absent counts per prayer)
 *    - perPrayer      Original per-prayer summary (attended/absent counts)
 *    - totalUsers     Total registered users
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { CLASSES, classLabel, classRank } from "@/lib/classes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam =
      searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const client = getServiceClient();

    // 1. Get all registered users (with their class)
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, name, class_name")
      .order("class_name", { ascending: true })
      .order("name", { ascending: true });

    if (usersError) throw usersError;

    // 2. Get today's attendance records
    const startOfDay = `${dateParam}T00:00:00+07:00`;
    const endOfDay = `${dateParam}T23:59:59+07:00`;

    const { data: records, error: recsError } = await client
      .from("attendance")
      .select("user_id, user_name, prayer_name, timestamp")
      .gte("timestamp", startOfDay)
      .lte("timestamp", endOfDay)
      .order("timestamp", { ascending: false });

    if (recsError) throw recsError;

    // 3. Build a lookup: for each prayer, which user IDs attended
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const attendedMap = new Map<string, Set<string>>(); // prayer → Set<userId>

    for (const p of prayers) attendedMap.set(p, new Set());
    for (const r of records || []) {
      const key = r.user_id || r.user_name || "unknown";
      attendedMap.get(r.prayer_name)?.add(key);
    }

    // 4. Build the ordered user list (sorted by class rank, then name)
    const userList = (users || [])
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        class_name: u.class_name ?? null,
      }))
      .sort((a: any, b: any) => {
        const r = classRank(a.class_name) - classRank(b.class_name);
        if (r !== 0) return r;
        return a.name.localeCompare(b.name);
      });

    // 5. Build per-user attendance rows
    type UserRow = {
      id: string;
      name: string;
      class_name: string | null;
      attendance: Record<string, boolean>;
      attendedCount: number;
    };

    const userRows: UserRow[] = userList.map((u: any) => {
      const attendance: Record<string, boolean> = {};
      let attendedCount = 0;
      for (const p of prayers) {
        const present = attendedMap.get(p)?.has(u.id) ?? false;
        attendance[p] = present;
        if (present) attendedCount++;
      }
      return { ...u, attendance, attendedCount };
    });

    // 6. Per-prayer summary (original style)
    const perPrayer = prayers.map((prayer) => {
      const attended = attendedMap.get(prayer) || new Set();
      const attendedUsers = userList.filter((u: any) => attended.has(u.id));
      const absentUsers = userList.filter((u: any) => !attended.has(u.id));
      const unknownCount = Array.from(attended).filter(
        (key: any) => !userList.some((u: any) => u.id === key),
      ).length;
      return {
        prayer: prayer,
        attended: attendedUsers,
        absent: absentUsers,
        attendedCount: attendedUsers.length,
        absentCount: absentUsers.length,
        unknownCount,
        totalUsers: userList.length,
      };
    });

    // 7. Per-class roll-up
    type ClassRollup = {
      className: string;
      total: number;
      attendance: Record<string, { present: number; absent: number }>;
      users: UserRow[];
    };

    const classGroups: Record<string, UserRow[]> = {};
    for (const row of userRows) {
      const label = classLabel(row.class_name);
      if (!classGroups[label]) classGroups[label] = [];
      classGroups[label].push(row);
    }

    // Sort class group keys by rank (X-A first, Tanpa Kelas last)
    const sortedClassKeys = Object.keys(classGroups).sort((a, b) => {
      if (a === "Tanpa Kelas") return 1;
      if (b === "Tanpa Kelas") return -1;
      return classRank(a) - classRank(b);
    });

    const classRollups: ClassRollup[] = sortedClassKeys.map((key) => {
      const group = classGroups[key];
      const attendance: Record<string, { present: number; absent: number }> = {};
      for (const p of prayers) {
        let present = 0;
        for (const u of group) {
          if (u.attendance[p]) present++;
        }
        attendance[p] = { present, absent: group.length - present };
      }
      return { className: key, total: group.length, attendance, users: group };
    });

    return NextResponse.json({
      date: dateParam,
      prayers,
      totalUsers: userList.length,
      users: userRows,
      classes: classRollups,
      perPrayer,
    });
  } catch (err: any) {
    console.error("[report] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}