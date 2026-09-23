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
 *  MODEL LOADING:
 *    Model weights are read directly from the filesystem (`public/models/face-api/`).
 *    We override `globalThis.fetch` at module-load time so that when face-api's
 *    Platform initializes (capturing `globalThis.fetch`), it picks up our
 *    filesystem-backed version.  This avoids the Vercel Deployment Protection
 *    issue where self-fetches are blocked.
 *
 *  EUCLIDEAN THRESHOLD:  0.45
 * =============================================================================
 */

import fs from "fs";
import path from "path";

// Type-only imports — erased at compile time, so they never trigger the
// face-api / tfjs module load during the Next.js build step.
import type { TinyFaceDetectorOptions } from "@vladmandic/face-api";
import type * as tfType from "@tensorflow/tfjs";

// `jpeg-js` is pure JavaScript — safe to import statically.
import jpeg from "jpeg-js";

/* ------------------------------------------------------------------ */
/*  Filesystem-backed global fetch                                     */
/* ------------------------------------------------------------------ */

/**
 * Replaces `globalThis.fetch` with a version that serves face-api model
 * files from the local filesystem.  Non-model requests are forwarded to
 * the original fetch.
 *
 * This MUST execute at module-load time (before face-api is imported)
 * because face-api's Platform class captures `globalThis.fetch` during
 * its constructor.
 */

const _originalFetch: typeof globalThis.fetch =
  globalThis.fetch?.bind(globalThis) as any;

/**
 * Resolves the absolute path to the model files directory.
 * Searches multiple common Vercel / local filesystem layouts.
 */
function findModelDir(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "models", "face-api"),
    path.join(cwd, ".next", "server", "public", "models", "face-api"),
    path.join(cwd, "models", "face-api"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  console.warn("[face-recognition] Model dir not found in:", candidates);
  return candidates[0];
}

const MODEL_DIR = findModelDir();
const MODEL_PATH_PREFIX = "/models/face-api/";

console.log("[face-recognition] Model directory:", MODEL_DIR);

globalThis.fetch = (async (url: any, init?: any) => {
  const urlStr = typeof url === "string" ? url : String(url);

  // Intercept requests for model weight files → serve from disk
  if (urlStr.includes(MODEL_PATH_PREFIX)) {
    const fileName = urlStr.split(MODEL_PATH_PREFIX).pop()!.split("?")[0];
    const filePath = path.join(MODEL_DIR, fileName);

    try {
      const buffer = fs.readFileSync(filePath);
      const isJson = fileName.endsWith(".json");
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": isJson
            ? "application/json"
            : "application/octet-stream",
          "Content-Length": String(buffer.length),
        },
      }) as any;
    } catch (err: any) {
      console.error(
        `[face-recognition] Failed to read ${fileName} from disk:`,
        err.message,
      );
      return new Response(null, { status: 404, statusText: "Not Found" }) as any;
    }
  }

  // Pass through to the original fetch for everything else
  if (_originalFetch) return _originalFetch(url, init);
  throw new Error(
    "[face-recognition] No global fetch for: " + urlStr,
  );
}) as typeof globalThis.fetch;

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
/*  Model loading                                                      */
/* ------------------------------------------------------------------ */

export async function initFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  const faceapi = await getFaceAPI();
  await (await getTF()).ready();

  // Our globalThis.fetch override (set at module-load time) handles
  // model-weight fetches by reading from the filesystem.  We pass a
  // dummy URL — face-api only uses it to construct file paths.
  const baseUrl = "https://localhost/models/face-api";
  console.log("[face-recognition] Loading models from disk via", baseUrl);

  try {
    await faceapi.nets.tinyFaceDetector.load(baseUrl);
    await faceapi.nets.faceLandmark68Net.load(baseUrl);
    await faceapi.nets.faceRecognitionNet.load(baseUrl);
  } catch (err) {
    console.error("[face-recognition] Model loading failed:", err);
    throw new Error(
      "Face model weights could not be loaded from public/models/face-api/. " +
        "Ensure the model files exist and are deployed correctly.",
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