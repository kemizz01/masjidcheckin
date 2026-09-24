/**
 * =============================================================================
 *  POST   /api/auth — Admin Login
 *  DELETE /api/auth — Admin Logout
 *
 *  Accepts a password and sets an `admin_token` cookie if correct.
 *  The cookie is httpOnly + sameSite, valid for 24 hours.
 *
 *  Body (POST):  { password: "…" }
 *
 *  ⚠️  Default password is "admin123".  Change it via the
 *     `ADMIN_PASSWORD` environment variable in `.env.local` / Vercel.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_TOKEN_VALUE } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };

    // Compare against the env var, falling back to the default.
    const expected =
      process.env.ADMIN_PASSWORD || "admin123";

    if (!body.password || body.password !== expected) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 },
      );
    }

    // Set a session cookie valid for 24 hours.
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE_NAME, ADMIN_TOKEN_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 h
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}

/** Logout — clears the admin_token cookie. */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0, // expire immediately
  });
  return response;
}