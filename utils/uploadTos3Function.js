import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import { triggerMediaConvertJob } from "./mediaConverter.js";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AR,
  credentials: {
    accessKeyId: process.env.AAK,
    secretAccessKey: process.env.ASK,
  },
});

export const uploadToS3 = async ({
  folderName,
  file,
  fileName,
  ContentType,
}) => {
  const bucket = process.env.ABN;
  const key = `${folderName}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: ContentType,
  });

  await s3.send(command);
  return key; // Store only the key
};

export const uploadToS3AndTranscode = async ({
  folderName,
  file,
  fileName,
  ContentType,
  topicId = null // Make topicId optional
}) => {
  const bucket = process.env.ABN;
  const key = `${folderName}/${fileName}`;

  try {
    // 1. Upload original file to S3
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: ContentType,
    });

    await s3.send(command);
    console.log(`✅ Original file uploaded: ${key}`);

    // 2. If it's a video, trigger MediaConvert job
    if (ContentType && ContentType.startsWith('video/')) {
      const jobId = await triggerMediaConvertJob(key, folderName, fileName);
      
      // 3. Only update topic if topicId is provided
      if (topicId) {
        const Topic = mongoose.model('Topic');
        await Topic.findByIdAndUpdate(topicId, {
          videoUrl: key,
          transcodingStatus: 'PROCESSING',
          mediaConvertJobId: jobId
        });
        console.log(`🎬 MediaConvert job started for topic: ${topicId}`);
      } else {
        console.log(`🎬 MediaConvert job started (no topic association): ${jobId}`);
      }
    } else if (topicId) {
      // For non-video files with topicId, just update the URL
      const Topic = mongoose.model('Topic');
      await Topic.findByIdAndUpdate(topicId, {
        noteUrl: key
      });
    }

    return key;
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    
    // Update topic status to failed only if topicId is provided
    if (topicId) {
      const Topic = mongoose.model('Topic');
      await Topic.findByIdAndUpdate(topicId, {
        transcodingStatus: 'FAILED'
      });
    }
    
    throw error;
  }
};


export const deleteFromS3 = async (fileKey) => {
  const bucket = process.env.ABN;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: fileKey,
  });

  await s3.send(command);
};

export const getPresignedUrl = async (fileKey, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.ABN,
    Key: fileKey,
  });

  return await getSignedUrl(s3, command, { expiresIn });
};
