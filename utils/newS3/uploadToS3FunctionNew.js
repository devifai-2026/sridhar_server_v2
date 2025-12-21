import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: process.env.AR,
  credentials: {
    accessKeyId: process.env.AAK,
    secretAccessKey: process.env.ASK,
  },
});

const BUCKET_NAME = process.env.ABN


const generatePublicUrl = (key) => {
  return `https://${process.env.ABN}.s3.${process.env.AR}.amazonaws.com/${key}`;
};



export const uploadToS3New = async ({ folderName, file, fileName, ContentType }) => {
  try {
    const key = `${folderName}/${Date.now()}_${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: ContentType,
      // Remove ACL parameter since bucket has ACLs disabled
    });

    await s3.send(command);
    
    console.log(`File uploaded successfully: ${key}`);
    
    // Return public URL
    return generatePublicUrl(key);
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

// Upload video file (same as uploadToS3New)
export const uploadToS3AndTranscodeNew = async ({ folderName, file, fileName, ContentType }) => {
  return await uploadToS3New({ folderName, file, fileName, ContentType });
};

// Delete file from S3
export const deleteFromS3 = async (fileUrl) => {
  try {
    if (!fileUrl) return;
    
    // Extract key from public URL
    const key = fileUrl.replace(`https://${BUCKET_NAME}.s3.${process.env.AR}.amazonaws.com/`, '');
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3.send(command);
    console.log(`File deleted from S3: ${key}`);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error(`S3 deletion failed: ${error.message}`);
  }
};

// Simple URL getter - just returns the URL as is
export const getPresignedUrl = async (fileUrl) => {
  return fileUrl;
};