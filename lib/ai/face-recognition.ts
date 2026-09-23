/**
 * =============================================================================
 *  Face Recognition Engine (Server-side)
 *
 *  Uses @vladmandic/face-api with the CPU backend of @tensorflow/tfjs.
 *  **All heavy dependencies are loaded via dynamic import()** so that the
 *  Next.js build phase never evaluates the face-api module (which would
 *  otherwise try to `require('@tensorflow/tfjs-node')` and fail).
 *
 *  At runtime (Vercel serverless), the packages are imported lazily on
 *  the first API call — cold-start penalty, but fully functional.
 *
 *  MODEL LOADING (IMPORTANT):
 *    face-api's `net.load()` uses `fetch()` internally.  `file://` URIs
 *    do NOT work in Node.js / Vercel serverless.  Instead, we point
 *    `load()` at the HTTP URL of the `public/models/face-api/` directory
 *    which Next.js serves as static assets.  The serverless function
 *    fetches from its own deployment origin.
 *
 *  EUCLIDEAN THRESHOLD:  0.45
 * =============================================================================
 */

// Type-only imports — erased at compile time, so they never trigger the
// face-api / tfjs module load during the Next.js build step.
import type { TinyFaceDetectorOptions } from "@vladmandic/face-api";
import type * as tfType from "@tensorflow/tfjs";

// `jpeg-js` is pure JavaScript — safe to import statically.
import jpeg from "jpeg-js";

/* ------------------------------------------------------------------ */
/*  Lazy module loaders                                                */
/* ------------------------------------------------------------------ */

let _faceapi: any = null;
let _tf: any = null;
let modelsLoaded = false;

async function getFaceAPI(): Promise<any> {
  // Force the ESM/browser build.  The Node.js build (face-api.node.js) at
  // the package's "main" field requires @tensorflow/tfjs-node, which has
  // native C++ addons that won't run on Vercel serverless.
  // The ESM build only depends on @tensorflow/tfjs (pure CPU/WASM).
  if (!_faceapi) _faceapi = await import("@vladmandic/face-api/dist/face-api.esm.js");
  return _faceapi;
}

async function getTF(): Promise<any> {
  if (!_tf) _tf = await import("@tensorflow/tfjs");
  return _tf;
}

/* ------------------------------------------------------------------ */
/*  Model-loading URL                                                  */
/* ------------------------------------------------------------------ */

/**
 * Returns the absolute HTTP base URL where the face-api model files are
 * served (`public/models/face-api/` in the Next.js filesystem).
 *
 * In production (Vercel), the function fetches from its own deployment
 * origin via the `VERCEL_URL` env var.  In local development it uses
 * `http://localhost:PORT`.
 */
function getModelBaseUrl(): string {
  // ---- Vercel production --------------------------------------------
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // ---- Detected via the request host (e.g., preview deployments) ----
  // Some Vercel runtimes set NEXT_PUBLIC_SITE_URL.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  // ---- Local dev ----------------------------------------------------
  return `http://localhost:${process.env.PORT || 3000}`;
}

/* ------------------------------------------------------------------ */
/*  Model loading                                                      */
/* ------------------------------------------------------------------ */

export async function initFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  const faceapi = await getFaceAPI();
  await (await getTF()).ready();

  const baseUrl = `${getModelBaseUrl()}/models/face-api`;
  console.log("[face-recognition] Loading models from:", baseUrl);

  try {
    await faceapi.nets.tinyFaceDetector.load(baseUrl);
    await faceapi.nets.faceLandmark68Net.load(baseUrl);
    await faceapi.nets.faceRecognitionNet.load(baseUrl);
  } catch (err) {
    console.error("[face-recognition] Model loading failed:", err);
    throw new Error(
      "Face model weights could not be loaded from " + baseUrl + ". " +
        "Ensure the files exist in public/models/face-api/.",
    );
  }

  modelsLoaded = true;
  console.log("[face-recognition] Models loaded ✓");
}

/* ------------------------------------------------------------------ */
/*  base64 → tf.Tensor3D                                               */
/* ------------------------------------------------------------------ */

export async function base64ToTensor(base64: string): Promise<any> {
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

export async function extractFaceDescriptor(
  base64: string,
): Promise<Float32Array | null> {
  await initFaceModels();

  const faceapi = await getFaceAPI();
  const tensor = await base64ToTensor(base64);

  try {
    // Cast through `unknown` to bridge minor type mismatches between
    // face-api's bundled tfjs types and the standalone @tensorflow/tfjs.
    const result = await faceapi
      .detectSingleFace(
        tensor as any,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result || !result.descriptor) return null;
    return result.descriptor as Float32Array;
  } catch (err) {
    console.error("[face-recognition] Detection error:", err);
    return null;
  } finally {
    tensor?.dispose?.();
  }
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function parseDescriptor(raw: unknown): Float32Array {
  if (raw instanceof Float32Array) return raw;
  if (Array.isArray(raw)) return new Float32Array(raw);
  if (typeof raw === "string") {
    try {
      return new Float32Array(JSON.parse(raw));
    } catch {
      throw new Error("Invalid descriptor format in database");
    }
  }
  throw new Error("Unsupported descriptor format");
}