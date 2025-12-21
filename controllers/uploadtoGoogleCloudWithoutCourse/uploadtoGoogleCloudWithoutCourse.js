// routes/upload.routes.js
import path from "path";
import fs from "fs";
import { 
  uploadToGoogleCloud, 
  uploadToGoogleCloudAndTranscode 
} from "../../utils/googleCloud/uploadToGoogleCloud.js";

const uploadtoGoogleCloudWithoutCourse = async (req, res) => {
  const BUCKET_NAME = 'sridhar-edu-bucket-2025';
  try {
    const { subjectName, moduleName } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const uploadedFiles = [];
    const baseFolderPath = `${subjectName}/${moduleName}`;

    for (const file of files) {
      const filePath = path.join(process.cwd(), file.path);
      const fileBuffer = fs.readFileSync(filePath);

      const fileName = `${Date.now()}_${file.originalname}`;

      let gcsUrl;

      // Use uploadToGoogleCloudAndTranscode for videos, uploadToGoogleCloud for other files
      if (file.mimetype.startsWith('video/')) {
        gcsUrl = await uploadToGoogleCloudAndTranscode({
          folderName: baseFolderPath,
          file: fileBuffer,
          fileName: fileName,
          contentType: file.mimetype,
        });
        
        console.log(`🎬 Video uploaded to Google Cloud: ${gcsUrl}`);
      } else {
        gcsUrl = await uploadToGoogleCloud({
          folderName: baseFolderPath,
          file: fileBuffer,
          fileName: fileName,
          contentType: file.mimetype,
        });
        
        console.log(`✅ File uploaded to Google Cloud: ${gcsUrl}`);
      }

      uploadedFiles.push({
        url: gcsUrl,
        key: gcsUrl.replace(`https://storage.googleapis.com/${BUCKET_NAME}/`, ''),
        type: file.mimetype.startsWith('video/') ? 'video' : 'file',
        transcoding: file.mimetype.startsWith('video/') ? 'TO_BE_IMPLEMENTED' : 'NOT_APPLICABLE',
        mimetype: file.mimetype,
        originalName: file.originalname,
        size: file.size
      });

      // Delete the temporary file
      fs.unlinkSync(filePath);
    }

    res.status(200).json({
      success: true,
      uploadedFiles,
      count: uploadedFiles.length,
      message: uploadedFiles.some(f => f.type === 'video')
        ? "Files uploaded to Google Cloud. Note: Video transcoding is to be implemented separately."
        : "Files uploaded to Google Cloud successfully."
    });
  } catch (err) {
    console.error('Error uploading to Google Cloud:', err);
    
    // Clean up any remaining temp files in case of error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(path.join(process.cwd(), file.path));
        } catch (cleanupErr) {
          console.error('Error cleaning up temp file:', cleanupErr);
        }
      });
    }
    
    res.status(500).json({
      error: err.message,
      details: "Failed to upload files to Google Cloud Storage"
    });
  }
};

export default uploadtoGoogleCloudWithoutCourse;