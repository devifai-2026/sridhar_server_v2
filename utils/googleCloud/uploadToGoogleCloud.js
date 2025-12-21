import { Storage } from '@google-cloud/storage';
import { TranscoderServiceClient } from '@google-cloud/video-transcoder';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Cloud clients
const storage = new Storage({
  keyFilename: path.join(__dirname, '../../config/google-cloud-key.json'),
  projectId: 'sridhar-edu-platform'
});

const transcoderClient = new TranscoderServiceClient({
  keyFilename: path.join(__dirname, '../../config/google-cloud-key.json'),
  projectId: 'sridhar-edu-platform'
});

const BUCKET_NAME = 'sridhar-edu-bucket-2025';
const bucket = storage.bucket(BUCKET_NAME);

export const uploadToGoogleCloud = async ({ folderName, file, fileName, contentType }) => {
  try {
    const sanitizedFileName = fileName.replace(/\s+/g, '-');
    const filePath = `${folderName}/${Date.now()}_${sanitizedFileName}`;
    
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: contentType,
      },
      resumable: false
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          // Make the file publicly accessible
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

export const uploadToGoogleCloudAndTranscode = async ({ folderName, file, fileName, contentType }) => {
  try {
    // For now, just upload without transcoding
    // You can implement transcoding later if needed
    const gcsUrl = await uploadToGoogleCloud({
      folderName,
      file,
      fileName,
      contentType
    });
    
    return gcsUrl;
  } catch (error) {
    console.error('Error in upload and transcode:', error);
    throw error;
  }
};

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