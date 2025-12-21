import cron from "node-cron";
import { Storage } from "@google-cloud/storage";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Cloud Storage (production-safe)
const storage = new Storage({
  projectId: process.env.PROJECT_ID, // from .env
});
// keyFilename is NOT needed; SDK reads GOOGLE_APPLICATION_CREDENTIALS

const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);

// Path to FFmpeg binary (installed globally)
const ffmpegPath = "ffmpeg"; 

// ... rest of your code remains unchanged ...
