/* =========================================================================
 * MasjidCheckIn — Client-side Image Normalisation
 *
 * Phone cameras and galleries hand us a wide variety of formats:
 *   - HEIC / HEIF (iPhone default)
 *   - PNG with transparency
 *   - Progressive JPEG
 *   - Massive 12 MP images
 *
 * The server-side face pipeline decodes images with `jpeg-js`, which only
 * understands **baseline JPEG**. Feeding it anything else caused the
 * `/api/register-face` 500 errors.
 *
 * This helper draws any browser-decodable image onto a canvas and re-encodes
 * it as a modest, baseline JPEG data URL — guaranteeing the server always
 * receives something it can read.
 * ========================================================================= */

/** Maximum width/height (px) of the normalised image. */
const MAX_DIMENSION = 1024;

/** JPEG quality (0–1). 0.85 keeps facial detail while staying small. */
const JPEG_QUALITY = 0.85;

/**
 * Load a `File`/`Blob` into an `HTMLImageElement`.
 * Rejects with a friendly message when the browser cannot decode it.
 */
function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Could not read this image file. Please use a JPG or PNG photo.",
        ),
      );
    };
    img.src = url;
  });
}

/**
 * Converts any image file into a normalised **baseline JPEG** data URL.
 *
 * @param file   The file chosen by the user.
 * @param maxDim Optional override for the maximum dimension (default 1024).
 * @returns A `data:image/jpeg;base64,…` string.
 */
export async function fileToNormalizedJpeg(
  file: File,
  maxDim: number = MAX_DIMENSION,
): Promise<string> {
  const img = await loadImageFromBlob(file);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (!width || !height) {
    throw new Error("The selected image has no readable dimensions.");
  }

  // Scale down so the longest edge is at most `maxDim`.
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");

  // White background first — PNG transparency would otherwise turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
