/**
 * =============================================================================
 *  /api/settings
 *
 *  GET → return the mosque settings (single row).
 *  PUT → update the mosque settings (name, latitude, longitude, radius).
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

async function getSettingsRow() {
  const client = getServiceClient();
  // The `settings` table is assumed to have a single row (id = 1).
  const { data, error } = await client
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET() {
  try {
    const settings = await getSettingsRow();
    return NextResponse.json({ settings: settings ?? null });
  } catch (err: any) {
    console.error("[settings] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      latitude?: number;
      longitude?: number;
      geofence_radius?: number;
    };

    const client = getServiceClient();

    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.latitude === "number") updates.latitude = body.latitude;
    if (typeof body.longitude === "number") updates.longitude = body.longitude;
    if (typeof body.geofence_radius === "number") updates.geofence_radius = body.geofence_radius;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update." },
        { status: 400 },
      );
    }

    const existing = await getSettingsRow();

    let result;
    if (existing) {
      result = await client
        .from("settings")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await client
        .from("settings")
        .insert({ id: 1, ...updates })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, settings: result.data });
  } catch (err: any) {
    console.error("[settings] PUT Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}