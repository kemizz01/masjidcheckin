/**
 * =============================================================================
 *  /api/scenes
 *
 *  GET    → list all scene references (valid mosque + blacklisted areas).
 *  DELETE → remove a scene reference (and its stored photo).
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient, deleteFromStorage } from "@/lib/supabase";
import { SCENES_BUCKET } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = getServiceClient();
    const { data: scenes, error } = await client
      .from("scene_references")
      .select("id, type, label, image_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ scenes: scenes ?? [] });
  } catch (err: any) {
    console.error("[scenes] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing 'id'." }, { status: 400 });
    }

    const client = getServiceClient();

    const { data: scene } = await client
      .from("scene_references")
      .select("image_url")
      .eq("id", id)
      .single();

    if (scene?.image_url) {
      const path = new URL(scene.image_url).pathname
        .split("/")
        .filter(Boolean)
        .slice(1)
        .join("/");
      await deleteFromStorage(SCENES_BUCKET, [path]);
    }

    const { error } = await client.from("scene_references").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[scenes] DELETE Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}