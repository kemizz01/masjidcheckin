/**
 * =============================================================================
 *  POST /api/register-face
 *
 *  DUAL-STORAGE REGISTRATION SYSTEM
 *  --------------------------------
 *  Receives a Base64 face image + a name (+ class), then writes to TWO places:
 *
 *    1. AI Storage (PostgreSQL `users` table)
 *         - Runs face detection & descriptor extraction (128 floats).
 *         - Saves the numeric descriptor in `users.face_descriptor`.
 *         - This is the ONLY part required for attendance to work.
 *
 *    2. Logs / Archive (Supabase Storage)
 *         - Uploads the raw image to the `maqam-faces-archive` bucket.
 *         - Saves the public URL in `users.archive_photo_url`.
 *         - **Best-effort**: if the bucket is unavailable, registration
 *           still succeeds — you just won't have a visual archive.
 *
 *  Body:  { image: "data:image/jpeg;base64,…", name: "Ahmad Fauzi", className: "X-A" }
 *
 *  Access: allowed when
 *    - the request carries a valid admin cookie, OR
 *    - the `registration_open` setting is true (public self-registration).
 *  If settings cannot be read, registration is allowed (fail-open) so the
 *  system never becomes unusable because of a misconfigured table.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient, uploadImageToStorage } from "@/lib/supabase";
import {
  extractFaceDescriptor,
  InvalidImageError,
} from "@/lib/ai/face-recognition";
import { FACES_BUCKET } from "@/lib/config";
import { CLASSES } from "@/lib/classes";
import { isAdminRequest } from "@/lib/adminAuth";

// Force Node.js runtime (AI models need the filesystem + CPU).
export const runtime = "nodejs";
// Allow up to 60s for model loading + detection (cold start).
export const maxDuration = 60;

/** Build a filesystem-safe slug from a name (falls back to a timestamp). */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `user-${Date.now()}`;
}

export async function POST(request: Request) {
  const warnings: string[] = [];

  try {
    // ---------------------------------------------------------------------
    // 1. Parse & validate the request body
    // ---------------------------------------------------------------------
    const body = (await request.json()) as {
      image?: string;
      name?: string;
      className?: string;
    };

    if (!body.image) {
      return NextResponse.json(
        { error: "Missing 'image'." },
        { status: 400 },
      );
    }
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Please provide a name." },
        { status: 400 },
      );
    }

    const name = body.name.trim();

    // Validate the class against the known registry (X-A … XII-H) when given.
    const className = body.className?.trim() ?? "";
    if (className && !CLASSES.includes(className)) {
      return NextResponse.json(
        { error: `Unknown class "${className}". Please pick a class from X-A to XII-H.` },
        { status: 400 },
      );
    }

    const client = getServiceClient();

    // ---------------------------------------------------------------------
    // 2. Access control — admins always allowed, public only when open
    // ---------------------------------------------------------------------
    const isAdmin = isAdminRequest(request);
    if (!isAdmin) {
      let registrationOpen = true; // fail-open if we can't read settings
      const { data: settings, error: settingsError } = await client
        .from("settings")
        .select("registration_open")
        .limit(1)
        .maybeSingle();

      if (!settingsError && settings) {
        registrationOpen = settings.registration_open ?? true;
      }

      if (!registrationOpen) {
        return NextResponse.json(
          {
            error:
              "Face registration is currently closed. Please ask an admin to enable it.",
          },
          { status: 403 },
        );
      }
    }

    // ---------------------------------------------------------------------
    // 3. Extract the face descriptor (128-d vector)
    // ---------------------------------------------------------------------
    let descriptor: Float32Array | null = null;
    try {
      descriptor = await extractFaceDescriptor(body.image);
    } catch (err: any) {
      if (err instanceof InvalidImageError || err?.name === "InvalidImageError") {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    if (!descriptor) {
      return NextResponse.json(
        {
          error:
            "No face detected. Please try again with a clear, well-lit, front-facing photo.",
        },
        { status: 422 },
      );
    }

    // ---------------------------------------------------------------------
    // 4. Best-effort archive upload (never blocks registration)
    // ---------------------------------------------------------------------
    let archivePhotoUrl: string | null = null;
    let storagePath: string | null = null;
    try {
      const raw = body.image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(raw, "base64");
      storagePath = `faces/${Date.now()}-${slugify(name)}.jpg`;
      archivePhotoUrl = await uploadImageToStorage(
        FACES_BUCKET,
        storagePath,
        imageBuffer,
        "image/jpeg",
      );
    } catch (err: any) {
      warnings.push(
        `Face photo could not be archived: ${err?.message ?? "unknown storage error"}`,
      );
      console.warn("[register-face] Archive upload skipped:", err?.message);
      storagePath = null;
      archivePhotoUrl = null;
    }

    // ---------------------------------------------------------------------
    // 5. Save the descriptor (+ metadata) into the `users` table
    // ---------------------------------------------------------------------
    const baseRow: Record<string, unknown> = {
      name,
      face_descriptor: Array.from(descriptor),
      archive_photo_url: archivePhotoUrl,
      created_at: new Date().toISOString(),
    };

    let user: any = null;
    let insertError: any = null;

    ({ data: user, error: insertError } = await client
      .from("users")
      .insert({ ...baseRow, class_name: className || null })
      .select()
      .single());

    // If the `class_name` column hasn't been added to the database yet,
    // retry without it so registration still works.
    if (insertError && /class_name/i.test(insertError.message ?? "")) {
      warnings.push(
        "The `class_name` column is missing from the `users` table, so the class was not saved. Run the SQL migration to enable class grouping.",
      );
      console.warn(
        "[register-face] class_name column missing — retrying insert without it.",
      );
      ({ data: user, error: insertError } = await client
        .from("users")
        .insert(baseRow)
        .select()
        .single());
    }

    if (insertError) {
      // Clean up the uploaded object if the DB insert ultimately failed.
      if (storagePath) {
        try {
          await client.storage.from(FACES_BUCKET).remove([storagePath]);
        } catch {
          /* ignore cleanup failures */
        }
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      warnings,
      user: {
        id: user.id,
        name: user.name,
        class_name: user.class_name ?? null,
        archive_photo_url: user.archive_photo_url ?? null,
      },
    });
  } catch (err: any) {
    console.error("[register-face] Error:", err);
    // Surface the underlying database / storage message so the admin can
    // see exactly what's wrong instead of a generic 500.
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}
