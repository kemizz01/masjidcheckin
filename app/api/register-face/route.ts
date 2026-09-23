/**
 * =============================================================================
 *  POST /api/register-face
 *
 *  DUAL-STORAGE REGISTRATION SYSTEM
 *  --------------------------------
 *  Receives a Base64 face image + a name, then writes to TWO places:
 *
 *    1. AI Storage (PostgreSQL `users` table)
 *         - Runs face detection & descriptor extraction (128 floats).
 *         - Saves the numeric descriptor in `users.face_descriptor`.
 *         - This is the fast, in-DB representation used during attendance.
 *
 *    2. Logs / Archive (Supabase Storage)
 *         - Converts the Base64 image back into a Buffer.
 *         - Uploads it to the `maqam-faces-archive` bucket.
 *         - Saves the public URL in `users.archive_photo_url` so admins
 *           can visually review the registered face later.
 *
 *  Body:  { image: "data:image/jpeg;base64,…", name: "Ahmad Fauzi" }
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient, uploadImageToStorage } from "@/lib/supabase";
import { extractFaceDescriptor } from "@/lib/ai/face-recognition";
import { FACES_BUCKET } from "@/lib/config";

// Force Node.js runtime (AI models need the filesystem + CPU).
export const runtime = "nodejs";
// Allow up to 60s for model loading + detection (cold start).
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------------------
    // 1. Parse & validate the request body
    // ---------------------------------------------------------------------
    const body = (await request.json()) as { image?: string; name?: string };

    if (!body.image || !body.name?.trim()) {
      return NextResponse.json(
        { error: "Both 'image' and 'name' are required." },
        { status: 400 },
      );
    }

    const name = body.name.trim();

    // ---------------------------------------------------------------------
    // 2. Extract the face descriptor (128-d vector)
    // ---------------------------------------------------------------------
    const descriptor = await extractFaceDescriptor(body.image);
    if (!descriptor) {
      return NextResponse.json(
        { error: "No face detected. Please try again with a clear, front-facing photo." },
        { status: 422 },
      );
    }

    // ---------------------------------------------------------------------
    // 3. Dual-storage — upload the raw image to Supabase Storage
    // ---------------------------------------------------------------------
    const client = getServiceClient();

    // Convert the Base64 data URL back into a Buffer for storage.
    const raw = body.image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(raw, "base64");

    const storagePath = `faces/${Date.now()}-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.jpg`;
    const archivePhotoUrl = await uploadImageToStorage(
      FACES_BUCKET,
      storagePath,
      imageBuffer,
      "image/jpeg",
    );

    // ---------------------------------------------------------------------
    // 4. Save the descriptor + archive URL into the `users` table
    // ---------------------------------------------------------------------
    const { data: user, error: insertError } = await client
      .from("users")
      .insert({
        name,
        // Store the descriptor as a plain array (Postgres `jsonb` / `float8[]`).
        face_descriptor: Array.from(descriptor),
        archive_photo_url: archivePhotoUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Clean up the uploaded object if the DB insert failed.
      await client.storage.from(FACES_BUCKET).remove([storagePath]);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        archive_photo_url: user.archive_photo_url,
      },
    });
  } catch (err: any) {
    console.error("[register-face] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}