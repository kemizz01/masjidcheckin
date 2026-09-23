/**
 * =============================================================================
 *  POST /api/register-scene
 *
 *  Registers a reference scene for verification:
 *    - type: "valid" (mosque interior) or "invalid" (blacklisted area).
 *
 *  Dual-storage for scenes:
 *    1. Uploads the raw photo to Supabase Storage (`maqam-scene-references`).
 *    2. Extracts a MobileNet embedding and saves it in the `descriptor`
 *       column of the `scene_references` table.
 *
 *  Body:  { image: "data:image/jpeg;base64,…", type: "valid"|"invalid", label?: string }
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient, uploadImageToStorage } from "@/lib/supabase";
import { extractSceneEmbedding } from "@/lib/ai/scene-verification";
import { SCENES_BUCKET } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      image?: string;
      type?: string;
      label?: string;
    };

    if (!body.image) {
      return NextResponse.json({ error: "Missing 'image'." }, { status: 400 });
    }
    if (body.type !== "valid" && body.type !== "invalid") {
      return NextResponse.json(
        { error: "'type' must be 'valid' or 'invalid'." },
        { status: 400 },
      );
    }

    // 1. Extract the MobileNet embedding.
    const embedding = await extractSceneEmbedding(body.image);
    if (!embedding) {
      return NextResponse.json(
        { error: "Could not extract a scene embedding from the image." },
        { status: 422 },
      );
    }

    // 2. Upload the raw image to storage.
    const raw = body.image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    const slug = (body.label ?? body.type).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const storagePath = `scenes/${body.type}/${Date.now()}-${slug}.jpg`;
    const imageUrl = await uploadImageToStorage(SCENES_BUCKET, storagePath, buffer, "image/jpeg");

    // 3. Save the reference row.
    const client = getServiceClient();
    const { data: scene, error } = await client
      .from("scene_references")
      .insert({
        type: body.type,
        label: body.label ?? (body.type === "valid" ? "mosque" : "blacklist"),
        image_url: imageUrl,
        descriptor: Array.from(embedding),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      await client.storage.from(SCENES_BUCKET).remove([storagePath]);
      throw error;
    }

    return NextResponse.json({ success: true, scene });
  } catch (err: any) {
    console.error("[register-scene] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}