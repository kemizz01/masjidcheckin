/**
 * =============================================================================
 *  Model Download / Copy Script
 *
 *  Populates `public/models/face-api/` by **copying** the pre-trained
 *  weights from the @vladmandic/face-api npm package (which ships them
 *  inside its `node_modules/model/` directory).
 *
 *  MobileNet V2 weights are NOT copied — they are fetched from the official
 *  CDN at runtime by the @tensorflow-models/mobilenet package.  The first
 *  cold start of /api/verify-scene will download ~13 MB (2-4 s).  Warm
 *  containers reuse the cached model instantly.
 *
 *  USAGE:
 *    node scripts/download-models.js
 *
 *  Output:
 *    public/models/face-api/   (~6.9 MB — 10 shard/weight files)
 * =============================================================================
 */

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public", "models");
const FACE_API_SRC = path.join(
  __dirname,
  "..",
  "node_modules",
  "@vladmandic",
  "face-api",
  "model",
);

function copyFaceApiModels() {
  console.log("📦 MasjidCheckIn — Model Copy Script\n");
  console.log("[1/1] face-api models (copied from node_modules)");

  if (!fs.existsSync(FACE_API_SRC)) {
    console.error(
      "  ❌ Source not found!\n" +
        "    Expected: " + FACE_API_SRC + "\n" +
        "    Did you run `npm install`?",
    );
    process.exit(1);
  }

  const dest = path.join(PUBLIC_DIR, "face-api");
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  // Copy only the recognition-related model pairs (binary + manifest).
  // We skip age_gender and expression — they aren't needed for attendance.
  const files = fs
    .readdirSync(FACE_API_SRC)
    .filter(
      (f) =>
        f.includes("face_recognition") ||
        f.includes("tiny_face_detector") ||
        f.includes("face_landmark_68") ||
        f.includes("ssd_mobilenetv1"),
    );

  let totalSize = 0;
  for (const file of files) {
    const src = path.join(FACE_API_SRC, file);
    const dst = path.join(dest, file);
    fs.copyFileSync(src, dst);
    const size = fs.statSync(dst).size;
    totalSize += size;
    console.log(`  ✅ ${file}  (${(size / 1024).toFixed(0)} kB)`);
  }

  console.log(
    `\n✅ Done — ${files.length} files (${(totalSize / 1024 / 1024).toFixed(1)} MB total) in public/models/face-api/`,
  );
  console.log("");
  console.log("   📌 MobileNet V2 weights will be fetched from the CDN at runtime.");
  console.log("      The first cold start of /api/verify-scene may take 2-4 seconds extra.");
  console.log("");
  console.log("   🔄 To deploy:");
  console.log("      git add public/models/");
  console.log("      git commit -m \"Add face-recognition model weights\"");
  console.log("      git push");
}

copyFaceApiModels();