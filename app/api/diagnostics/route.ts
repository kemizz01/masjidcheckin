/**
 * =============================================================================
 *  GET /api/diagnostics  (admin only)
 *
 *  A fast, read-only health check that surfaces the most common causes of
 *  "it doesn't work" without needing to dig through Vercel logs:
 *
 *    - Are the required env vars set?
 *    - Are the face-api model weight files present on disk?
 *    - Can we reach Supabase, and does the schema have the columns the
 *      app expects (`users.class_name`, `settings.registration_open`,
 *      `settings.scene_detection`, `settings.attendance_open`)?
 *    - Do the storage buckets used for photo archiving exist?
 *
 *  Nothing here is destructive — it only reads.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServiceClient } from "@/lib/supabase";
import { FACES_BUCKET, SCENES_BUCKET } from "@/lib/config";
import { isAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 30;

function checkModelFiles(): { ok: boolean; dir: string; missing: string[] } {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "models", "face-api"),
    path.join(cwd, ".next", "server", "public", "models", "face-api"),
    path.join(cwd, "models", "face-api"),
  ];
  const dir = candidates.find((c) => fs.existsSync(c)) ?? candidates[0];

  const required = [
    "tiny_face_detector_model-weights_manifest.json",
    "face_landmark_68_model-weights_manifest.json",
    "face_recognition_model-weights_manifest.json",
  ];

  const missing = required.filter((f) => !fs.existsSync(path.join(dir, f)));
  return { ok: missing.length === 0, dir, missing };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const report: Record<string, unknown> = {};

  // -------------------------------------------------------------------
  // 1. Environment variables
  // -------------------------------------------------------------------
  report.env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    region: process.env.VERCEL_REGION ?? "unknown",
  };

  // -------------------------------------------------------------------
  // 2. Face model files on disk
  // -------------------------------------------------------------------
  try {
    report.models = checkModelFiles();
  } catch (err: any) {
    report.models = { ok: false, error: err?.message };
  }

  // -------------------------------------------------------------------
  // 3. Database connectivity + expected columns
  // -------------------------------------------------------------------
  const db: Record<string, unknown> = { connected: false };
  try {
    const client = getServiceClient();

    // `users` table + class_name column
    const usersProbe = await client
      .from("users")
      .select("id, class_name", { count: "exact", head: true });
    db.connected = true;
    db.users_table = !usersProbe.error;
    db.users_class_name_column = !usersProbe.error;
    if (usersProbe.error) {
      db.users_error = usersProbe.error.message;
    }

    // `settings` table + feature flag columns
    const settingsProbe = await client
      .from("settings")
      .select("registration_open, scene_detection, attendance_open")
      .limit(1)
      .maybeSingle();
    db.settings_table = !settingsProbe.error;
    if (settingsProbe.error) {
      db.settings_error = settingsProbe.error.message;
    } else {
      db.settings_row_exists = Boolean(settingsProbe.data);
    }

    // How many users have a usable face descriptor?
    const { data: descriptorRows, error: descriptorError } = await client
      .from("users")
      .select("id, face_descriptor");
    if (!descriptorError && descriptorRows) {
      db.total_users = descriptorRows.length;
      db.users_with_descriptor = descriptorRows.filter(
        (u: any) => u.face_descriptor != null,
      ).length;
    }
  } catch (err: any) {
    db.connected = false;
    db.error = err?.message ?? "Unknown database error.";
  }
  report.database = db;

  // -------------------------------------------------------------------
  // 4. Storage buckets
  // -------------------------------------------------------------------
  const storage: Record<string, unknown> = {};
  try {
    const client = getServiceClient();
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) {
      storage.error = error.message;
    } else {
      const names = (buckets ?? []).map((b: any) => b.name);
      storage.faces_bucket_exists = names.includes(FACES_BUCKET);
      storage.scenes_bucket_exists = names.includes(SCENES_BUCKET);
      storage.buckets = names;
    }
  } catch (err: any) {
    storage.error = err?.message;
  }
  report.storage = storage;

  return NextResponse.json(report);
}
