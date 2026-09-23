/**
 * =============================================================================
 *  Model Download Script
 *
 *  Downloads the pre-trained weights required by the server-side AI handlers:
 *    - face-api (tiny_face_detector, face_landmark_68, face_recognition)
 *    - MobileNet V2  (image classification / embedding model)
 *
 *  USAGE:
 *    node scripts/download-models.js
 *
 *  Output:  public/models/face-api/       (~6.7 MB)
 *           public/models/mobilenet/      (~13 MB)
 *
 *  Models are fetched from the official GitHub / TFHub CDNs.
 * =============================================================================
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public", "models");

/* ---------------------------------------------------------------------------
 *  face-api model files (hosted on the vladmandic/face-api repo)
 * ------------------------------------------------------------------------- */
const FACE_API_BASE =
  "https://raw.githubusercontent.com/vladmandic/face-api/master/model/";

const FACE_API_FILES = [
  // tiny_face_detector
  "tiny_face_detector_model-shard1",
  "tiny_face_detector_model-weights_manifest.json",
  // face_landmark_68
  "face_landmark_68_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  // face_recognition
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
  "face_recognition_model-shard3",
  "face_recognition_model-shard4",
  "face_recognition_model-shard5",
  "face_recognition_model-shard6",
  "face_recognition_model-shard7",
  "face_recognition_model-shard8",
  "face_recognition_model-shard9",
  "face_recognition_model-shard10",
  "face_recognition_model-shard11",
  "face_recognition_model-shard12",
  "face_recognition_model-weights_manifest.json",
  // SsdMobilenet v1 (optional fallback for larger faces)
  "ssd_mobilenetv1_model-shard1",
  "ssd_mobilenetv1_model-shard2",
  "ssd_mobilenetv1_model-weights_manifest.json",
];

/* ---------------------------------------------------------------------------
 *  MobileNet V2 model files (hosted on TFHub via Google Storage)
 * ------------------------------------------------------------------------- */
const MOBILENET_BASE =
  "https://storage.googleapis.com/tfhub-tfjs-modules/google/imagenet/mobilenet_v2_100_224/classification/3/";

const MOBILENET_FILES = [
  "model.json",
  "group1-shard1of55.bin",
  "group1-shard2of55.bin",
  "group1-shard3of55.bin",
  "group1-shard4of55.bin",
  "group1-shard5of55.bin",
  "group1-shard6of55.bin",
  "group1-shard7of55.bin",
  "group1-shard8of55.bin",
  "group1-shard9of55.bin",
  "group1-shard10of55.bin",
  "group1-shard11of55.bin",
  "group1-shard12of55.bin",
  "group1-shard13of55.bin",
  "group1-shard14of55.bin",
  "group1-shard15of55.bin",
  "group1-shard16of55.bin",
  "group1-shard17of55.bin",
  "group1-shard18of55.bin",
  "group1-shard19of55.bin",
  "group1-shard20of55.bin",
  "group1-shard21of55.bin",
  "group1-shard22of55.bin",
  "group1-shard23of55.bin",
  "group1-shard24of55.bin",
  "group1-shard25of55.bin",
  "group1-shard26of55.bin",
  "group1-shard27of55.bin",
  "group1-shard28of55.bin",
  "group1-shard29of55.bin",
  "group1-shard30of55.bin",
  "group1-shard31of55.bin",
  "group1-shard32of55.bin",
  "group1-shard33of55.bin",
  "group1-shard34of55.bin",
  "group1-shard35of55.bin",
  "group1-shard36of55.bin",
  "group1-shard37of55.bin",
  "group1-shard38of55.bin",
  "group1-shard39of55.bin",
  "group1-shard40of55.bin",
  "group1-shard41of55.bin",
  "group1-shard42of55.bin",
  "group1-shard43of55.bin",
  "group1-shard44of55.bin",
  "group1-shard45of55.bin",
  "group1-shard46of55.bin",
  "group1-shard47of55.bin",
  "group1-shard48of55.bin",
  "group1-shard49of55.bin",
  "group1-shard50of55.bin",
  "group1-shard51of55.bin",
  "group1-shard52of55.bin",
  "group1-shard53of55.bin",
  "group1-shard54of55.bin",
  "group1-shard55of55.bin",
];

/* ---------------------------------------------------------------------------
 *  Helper: download a single file with progress reporting
 * ------------------------------------------------------------------------- */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        // Handle redirects (GitHub raw might redirect)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(res.headers.location, destPath).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;
        res.on("data", (chunk) => {
          downloaded += chunk.length;
          if (total) process.stdout.write(`\r  ${path.basename(destPath)}  ${Math.round((downloaded / total) * 100)}%`);
        });
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          process.stdout.write("\r\x1b[K"); // clear line
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

/* ---------------------------------------------------------------------------
 *  Main
 * ------------------------------------------------------------------------- */
(async () => {
  console.log("📦 MasjidCheckIn — Model Downloader\n");

  // -------- face-api --------
  console.log("[1/2] face-api models");
  const faceDir = path.join(PUBLIC_DIR, "face-api");
  for (const file of FACE_API_FILES) {
    const url = FACE_API_BASE + file;
    const dest = path.join(faceDir, file);
    try {
      await downloadFile(url, dest);
      console.log(`  ✅ ${file}`);
    } catch (err) {
      console.error(`  ❌ ${file} — ${err.message}`);
    }
  }

  // -------- MobileNet --------
  console.log("\n[2/2] MobileNet V2 models");
  const mobilenetDir = path.join(PUBLIC_DIR, "mobilenet");
  for (const file of MOBILENET_FILES) {
    const url = MOBILENET_BASE + file;
    const dest = path.join(mobilenetDir, file);
    try {
      await downloadFile(url, dest);
      console.log(`  ✅ ${file}`);
    } catch (err) {
      console.error(`  ❌ ${file} — ${err.message}`);
    }
  }

  console.log("\n✅ Download complete. Models are in public/models/");
})().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});