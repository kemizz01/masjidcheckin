/**
 * =============================================================================
 *  /api/users
 *
 *  GET    → list all registered Jamaah (with their archive photo URL).
 *  DELETE → remove a user (and their archived face photo from Storage).
 *
 *  Used by the Admin panel "Jamaah" tab.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient, deleteFromStorage } from "@/lib/supabase";
import { FACES_BUCKET } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = getServiceClient();
    const { data: users, error } = await client
      .from("users")
      .select("id, name, created_at, face_descriptor, archive_photo_url")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Strip the heavy descriptor from the list payload (admin UI only needs
    // the metadata + photo URL).
    const slim = (users ?? []).map((u: Record<string, unknown>) => ({
      id: u.id,
      name: u.name,
      created_at: u.created_at,
      archive_photo_url: u.archive_photo_url,
      has_descriptor: Array.isArray(u.face_descriptor) && u.face_descriptor.length > 0,
    }));

    return NextResponse.json({ users: slim });
  } catch (err: any) {
    console.error("[users] Error:", err);
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

    // Fetch the user first so we can also clean up their archived photo.
    const { data: user } = await client
      .from("users")
      .select("archive_photo_url")
      .eq("id", id)
      .single();

    if (user?.archive_photo_url) {
      // Extract the storage path from the public URL.
      const path = new URL(user.archive_photo_url).pathname
        .split("/")
        .filter(Boolean)
        .slice(1) // drop the bucket name
        .join("/");
      await deleteFromStorage(FACES_BUCKET, [path]);
    }

    const { error } = await client.from("users").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[users] DELETE Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}