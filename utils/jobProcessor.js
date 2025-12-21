// gcs-video-fix-cron.js
import cron from "node-cron";
import { Storage } from "@google-cloud/storage";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: path.join(__dirname, "..", "config", "google-cloud-key.json"),
  projectId: "sridhar-edu-platform",
});

const bucketName = "sridhar-edu-bucket-2025";
const bucket = storage.bucket(bucketName);

// Path to FFmpeg binary (assumes installed globally or in PATH)
const ffmpegPath = "ffmpeg"; // or full path if using a static binary

// Function to optimize a single video
const optimizeVideo = async (file) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-"));
  const localInput = path.join(tempDir, "input.mp4");
  const localOutput = path.join(tempDir, "output.mp4");

  try {
    // Check if video is already optimized using GCS metadata
    const [metadata] = await file.getMetadata();
    if (metadata.metadata?.optimized === "true") {
      console.log(`⏭ Skipping already optimized video: ${file.name}`);
      return;
    }

    console.log(`⬇ Downloading: ${file.name}`);
    await file.download({ destination: localInput });

    console.log(`🎞 Optimizing: ${file.name}`);
    await new Promise((resolve, reject) => {
      execFile(
        ffmpegPath,
        ["-i", localInput, "-c", "copy", "-movflags", "+faststart", localOutput],
        (err, stdout, stderr) => {
          if (err) return reject(err);
          resolve(stdout);
        }
      );
    });

    console.log(`⬆ Uploading optimized video: ${file.name}`);
    await bucket.upload(localOutput, {
      destination: file.name,
      resumable: false,
      metadata: { metadata: { optimized: "true" } }, // Mark as optimized
    });

    console.log(`✅ Optimized & uploaded: ${file.name}`);
  } catch (error) {
    console.error(`❌ Error optimizing ${file.name}:`, error.message);
  } finally {
    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

// Function to check all MP4s in bucket
const checkAllVideos = async () => {
  try {
    console.log("🔄 Checking all MP4s in bucket for optimization...");
    const [files] = await bucket.getFiles({ autoPaginate: true });


    const mp4Files = files.filter((f) => f.name.endsWith(".mp4"));
    console.log(`📊 Found ${mp4Files.length} MP4 files`);

    for (const file of mp4Files) {
      await optimizeVideo(file);
      // Small delay to avoid throttling
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("✅ Finished checking & optimizing all videos");
  } catch (error) {
    console.error("❌ Error in video checker:", error);
  }
};

// Run every 2 minutes
cron.schedule("*/2 * * * *", checkAllVideos);

// Also run immediately on startup (after 10 second delay)
setTimeout(() => {
  console.log("🚀 Starting initial GCS video check...");
  checkAllVideos();
}, 10000);

console.log("✅ Background GCS video processor started - checking every 2 minutes");

export default checkAllVideos;
