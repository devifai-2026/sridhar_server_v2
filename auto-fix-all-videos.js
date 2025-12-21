// auto-fix-all-videos.js
/**
 * 🔥 This script:
 *  1. Lists all MP4 videos in the bucket
 *  2. Downloads each video locally (stream)
 *  3. Runs ffmpeg with -movflags +faststart
 *  4. Uploads optimized video back to same bucket path
 *  5. Deletes temp files
 */

import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GOOGLE CLOUD CONFIG -------------------------------------
const bucketName = "sridhar-edu-bucket-2025";
const storage = new Storage({
  keyFilename: path.join(__dirname, "config", "google-cloud-key.json"),
  projectId: "sridhar-edu-platform",
});

const bucket = storage.bucket(bucketName);

// ----------------------------------------------------------

async function listMp4Files() {
  console.log("📦 Fetching list of MP4 files from bucket...");

  const [files] = await bucket.getFiles({
    prefix: "", // scan whole bucket (or set subfolder path)
  });

  const mp4Files = files.filter(file => file.name.endsWith(".mp4"));

  console.log(`🎬 Found ${mp4Files.length} MP4 videos.`);
  return mp4Files;
}

async function optimizeVideo(file) {
  console.log(`\n⚙️ Processing: ${file.name}`);

  const tmpDir = os.tmpdir();
  const localInput = path.join(tmpDir, "input-" + path.basename(file.name));
  const localOutput = path.join(tmpDir, "output-" + path.basename(file.name));

  try {
    // 1. DOWNLOAD ------------------------------------------------
    console.log("⬇ Downloading...");
    await new Promise((resolve, reject) => {
      file
        .createReadStream()
        .pipe(fs.createWriteStream(localInput))
        .on("finish", resolve)
        .on("error", reject);
    });

    // 2. PROCESS WITH FFMPEG -------------------------------------
    console.log("🎞 Running FFmpeg optimization (-movflags +faststart)...");

    await new Promise((resolve, reject) => {
      ffmpeg(localInput)
        .outputOptions(["-movflags +faststart", "-c copy"])
        .save(localOutput)
        .on("end", resolve)
        .on("error", reject);
    });

    // 3. UPLOAD BACK TO BUCKET ----------------------------------
    console.log("⬆ Uploading optimized file back to bucket (overwrite)...");

    await bucket.upload(localOutput, {
      destination: file.name,
      metadata: {
        contentType: "video/mp4",
        cacheControl: "public, max-age=31536000",
      },
    });

    console.log("✅ Optimized & uploaded:", file.name);
  } catch (err) {
    console.error("❌ Error processing", file.name, err.message);
  } finally {
    // 4. CLEAN TEMP FILES ---------------------------------------
    if (fs.existsSync(localInput)) fs.unlinkSync(localInput);
    if (fs.existsSync(localOutput)) fs.unlinkSync(localOutput);
  }
}

async function start() {
  console.log("🚀 Starting automatic MP4 optimization...\n");

  const mp4Files = await listMp4Files();

  for (const file of mp4Files) {
    await optimizeVideo(file);
  }

  console.log("\n🎉 COMPLETED: All MP4 videos processed!");
}

start();
