/**
 * =============================================================================
 *  POST /api/verify-scene
 *
 *  Confirms the attendee is physically inside the mosque (and NOT in a
 *  blacklisted area such as a classroom).
 *
 *  Pipeline:
 *    1. Decode the incoming Base64 room image.
 *    2. Extract a MobileNet V2 embedding (1280-d).
 *    3. Fetch `scene_references` from Supabase (both valid & invalid scenes).
 *    4. Compute cosine similarity against every reference.
 *    5. The scene is considered VALID when:
 *         - its best similarity to a *valid* reference is > 0.70, AND
 *         - that similarity exceeds its best similarity to any *invalid*
 *           (blacklisted) reference (i.e. it looks MORE like the mosque
 *           than a classroom).
 *
 *  Body:  { image: "data:image/jpeg;base64,…" }
 *  Returns: { pass: true, score: 0.86, label: "prayer_hall" }
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import {
  extractSceneEmbedding,
  cosineSimilarity,
  parseSceneDescriptor,
} from "@/lib/ai/scene-verification";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Cosine-similarity threshold above which we consider a scene a match. */
const SCENE_THRESHOLD = 0.7;

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------------------
    // 1. Parse body
    // ---------------------------------------------------------------------
    const body = (await request.json()) as { image?: string };
    if (!body.image) {
      return NextResponse.json({ error: "Missing 'image'." }, { status: 400 });
    }

    // ---------------------------------------------------------------------
    // 2. Extract the incoming scene embedding
    // ---------------------------------------------------------------------
    const incoming = await extractSceneEmbedding(body.image);
    if (!incoming) {
      return NextResponse.json(
        { pass: false, score: null, label: null, reason: "no_embedding" },
        { status: 200 },
      );
    }

    // ---------------------------------------------------------------------
    // 3. Fetch scene references
    // ---------------------------------------------------------------------
    const client = getServiceClient();
    const { data: references, error } = await client
      .from("scene_references")
      .select("id, type, label, descriptor");

    if (error) throw error;
    if (!references || references.length === 0) {
      return NextResponse.json(
        { pass: false, score: null, label: null, reason: "no_references" },
        { status: 200 },
      );
    }

    // ---------------------------------------------------------------------
    // 4. Compare against valid vs invalid references
    // ---------------------------------------------------------------------
    let bestValid: { score: number; label: string } | null = null;
    let bestInvalid: { score: number; label: string } | null = null;

    for (const ref of references) {
      let descriptor: Float32Array;
      try {
        descriptor = parseSceneDescriptor(ref.descriptor);
      } catch {
        continue;
      }

      const score = cosineSimilarity(incoming, descriptor);

      if (ref.type === "valid") {
        if (!bestValid || score > bestValid.score) {
          bestValid = { score, label: ref.label ?? "mosque" };
        }
      } else {
        if (!bestInvalid || score > bestInvalid.score) {
          bestInvalid = { score, label: ref.label ?? "blacklist" };
        }
      }
    }

    // ---------------------------------------------------------------------
    // 5. Decision
    // ---------------------------------------------------------------------
    const validScore = bestValid?.score ?? 0;
    const invalidScore = bestInvalid?.score ?? 0;

    // Secure match: must strongly resemble the mosque AND clearly differ
    // from blacklisted areas.
    const pass = validScore > SCENE_THRESHOLD && validScore > invalidScore;

    return NextResponse.json({
      pass,
      score: validScore,
      label: bestValid?.label ?? null,
      blacklist_score: invalidScore,
    });
  } catch (err: any) {
    console.error("[verify-scene] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error." },
      { status: 500 },
    );
  }
}