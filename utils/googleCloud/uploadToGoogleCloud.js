import { Storage } from '@google-cloud/storage';
import { TranscoderServiceClient } from '@google-cloud/video-transcoder';
import path from 'path';
import 'dotenv/config'; // load .env

const BUCKET_NAME = process.env.BUCKET_NAME;

// Initialize Google Cloud clients
// Use environment variables for credentials
const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  // keyFilename is NOT needed; SDK reads GOOGLE_APPLICATION_CREDENTIALS
});

const transcoderClient = new TranscoderServiceClient({
  projectId: process.env.PROJECT_ID,
  // keyFilename is NOT needed; SDK reads GOOGLE_APPLICATION_CREDENTIALS
});

const bucket = storage.bucket(BUCKET_NAME);

// Upload file to GCS
export const uploadToGoogleCloud = async ({ folderName, file, fileName, contentType }) => {
  try {
    const sanitizedFileName = fileName.replace(/\s+/g, '-');
    const filePath = `${folderName}/${Date.now()}_${sanitizedFileName}`;
    
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType,
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', reject);

      blobStream.on('finish', async () => {
        try {
          // Optional: make file public (or use signed URLs instead)
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
          resolve(publicUrl);
        } catch (error) {
          reject(error);
        }
      });

      blobStream.end(file);
    });
  } catch (error) {
    console.error('Error uploading to Google Cloud:', error);
    throw error;
  }
};

// Upload + transcode (currently just upload)
export const uploadToGoogleCloudAndTranscode = async ({ folderName, file, fileName, contentType }) => {
  try {
    return await uploadToGoogleCloud({ folderName, file, fileName, contentType });
  } catch (error) {
    console.error('Error in upload and transcode:', error);
    throw error;
  }
};

// Delete file from GCS
export const deleteFromGoogleCloud = async (fileUrl) => {
  try {
    const filePath = fileUrl.replace(`https://storage.googleapis.com/${BUCKET_NAME}/`, '');
    await bucket.file(filePath).delete();
    console.log(`File deleted: ${filePath}`);
  } catch (error) {
    console.error('Error deleting from Google Cloud:', error);
    throw error;
  }
};
