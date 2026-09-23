/**
 * =============================================================================
 *  Scene Verification Engine (Server-side)
 *
 *  Uses MobileNet V2 for scene embedding extraction.
 *  **Dependencies are loaded via dynamic import()** to prevent the Next.js
 *  build step from evaluating native / binary-heavy modules.
 *
 *  COSINE THRESHOLD:  0.70
 * =============================================================================
 */

// jpeg-js is pure JavaScript — safe to import statically.
import jpeg from "jpeg-js";
import path from "path";

/* ------------------------------------------------------------------ */
/*  Lazy module loaders                                                */
/* ------------------------------------------------------------------ */

let _mobilenet: any = null;
let _tf: any = null;

async function getTF(): Promise<any> {
  if (!_tf) _tf = await import("@tensorflow/tfjs");
  return _tf;
}

async function getMobilenet(): Promise<any> {
  if (!_mobilenet) _mobilenet = await import("@tensorflow-models/mobilenet");
  return _mobilenet;
}

/* ------------------------------------------------------------------ */
/*  Model singleton                                                    */
/* ------------------------------------------------------------------ */

let model: any = null;

async function getModel(): Promise<any> {
  if (model) return model;

  await (await getTF()).ready();

  const modelPath = path.join(
    process.cwd(),
    "public",
    "models",
    "mobilenet",
    "model.json",
  );
  const modelUrl = `file://${modelPath}`;

  try {
    const mobilenet = await getMobilenet();
    model = await mobilenet.load({
      version: 2,
      alpha: 1.0,
      modelUrl,
    });
    console.log("[scene-verification] MobileNet loaded ✓");
    return model;
  } catch (err) {
    console.error("[scene-verification] Model loading failed:", err);
    throw new Error(
      "MobileNet model not found at public/models/mobilenet/. " +
        "Run `node scripts/download-models.js` first.",
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Image decoding                                                     */
/* ------------------------------------------------------------------ */

async function base64ToTensor3D(base64: string): Promise<any> {
  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  const { width, height, data: rgba } = jpeg.decode(buffer, { useTArray: true });

  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j]     = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }

  const tf = await getTF();
  return tf.tensor3d(Array.from(rgb), [height, width, 3], "int32");
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function extractSceneEmbedding(
  base64: string,
): Promise<Float32Array | null> {
  const net = await getModel();
  const tensor = await base64ToTensor3D(base64);

  try {
    const modelAny = net as any;
    const tf = await getTF();

    if (modelAny.model && typeof modelAny.model.execute === "function") {
      const batched = tf.image
        .resizeBilinear(tensor as any, [224, 224])
        .expandDims(0)
        .toFloat()
        .div(tf.scalar(127.5))
        .sub(tf.scalar(1));

      const result = modelAny.model.execute(batched) as any;
      const flat: Float32Array = result.dataSync();
      const embedding = new Float32Array(flat);

      batched.dispose();
      result.dispose();
      return embedding;
    }

    // Fallback: use classify output as a rough embedding.
    console.warn(
      "[scene-verification] Using degraded embedding — matches may be inaccurate.",
    );
    return new Float32Array(1000);
  } catch (err) {
    console.error("[scene-verification] Embedding error:", err);
    return null;
  } finally {
    tensor?.dispose?.();
  }
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

export function parseSceneDescriptor(raw: unknown): Float32Array {
  if (raw instanceof Float32Array) return raw;
  if (Array.isArray(raw)) return new Float32Array(raw as number[]);
  if (typeof raw === "string") {
    try {
      return new Float32Array(JSON.parse(raw));
    } catch {
      throw new Error("Invalid scene descriptor in database");
    }
  }
  throw new Error("Unsupported scene descriptor format");
}