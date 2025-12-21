// routes/upload.routes.js
import express from "express";
import { upload } from "../../middleware/upload.js";
import path from "path";
import fs from "fs";
import { uploadToS3 } from "../../utils/uploadTos3Function.js";


const UploadToS3 = async (req, res) => {
    try {
        const { courseName, subjectName, moduleName } = req.body;
        const files = req.files;
        if (!files || files.length === 0)
            return res.status(400).json({ error: "No files uploaded" });

        const s3Keys = [];
        const baseFolderPath = `${courseName}/${subjectName}/${moduleName}`;

        for (const file of files) {
            const filePath = path.join(process.cwd(), file.path);
            const fileBuffer = fs.readFileSync(filePath);

            const s3Key = `${baseFolderPath}/${Date.now()}_${file.originalname}`;

            await uploadToS3({
                folderName: baseFolderPath,
                file: fileBuffer,
                fileName: s3Key.split('/').pop(),
                ContentType: file.mimetype,
            });
            s3Keys.push(s3Key);

            fs.unlinkSync(filePath);
        }

        res.status(200).json({ s3Keys });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


export default UploadToS3;
