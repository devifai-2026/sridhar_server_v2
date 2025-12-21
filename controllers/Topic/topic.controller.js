import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Topic from "../../models/topic.model.js";
import Course from "../../models/course.model.js";
import Subject from "../../models/subject.model.js";
import Module from "../../models/module.model.js";
import {
  uploadToGoogleCloud,
  deleteFromGoogleCloud,
  uploadToGoogleCloudAndTranscode,
} from "../../utils/googleCloud/uploadToGoogleCloud.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, "../uploads");

// Ensure upload directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const getFolderName = async (courseId, subjectId, moduleId) => {
  try {
    const course = await Course.findById(courseId);
    const subject = await Subject.findById(subjectId);
    const module = await Module.findById(moduleId);

    if (!course) throw new Error("Course not found");
    if (!subject) throw new Error("Subject not found");
    if (!module) throw new Error("Module not found");

    return `${course.name}/${subject.subjectName}/${module.name}`.replace(
      /\s+/g,
      "-"
    );
  } catch (error) {
    console.error("Error in getFolderName:", error.message);
    throw new Error(`Invalid IDs provided: ${error.message}`);
  }
};

export const createTopic = async (req, res) => {
  try {
    console.log("=== CREATE TOPIC REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const {
      courseId,
      subjectId,
      moduleId,
      name,
      topicOrder,
      description,
      isActive,
      videoMetadata,
      videoUrl, // <— ADD THIS
    } = req.body;

    // Validate required fields
    if (!courseId || !subjectId || !moduleId || !name || !topicOrder) {
      return res.status(400).json({
        error:
          "Missing required fields: courseId, subjectId, moduleId, name, topicOrder are required",
      });
    }

    // Validate topicOrder cannot be 0 or negative
    const orderNumber = parseInt(topicOrder);
    if (orderNumber <= 0) {
      return res.status(400).json({
        success: false,
        error: "Topic order must be a positive number (greater than 0)",
      });
    }

    // Check for duplicate topicOrder in the same module
    const existingTopic = await Topic.findOne({
      courseId,
      subjectId,
      moduleId,
      topicOrder: orderNumber,
    });

    if (existingTopic) {
      return res.status(409).json({
        success: false,
        error: `Topic with order ${topicOrder} already exists in this module. Please use a different order number.`,
      });
    }

    console.log("All required fields present, generating folder name...");

    let folderName;
    try {
      folderName = await getFolderName(courseId, subjectId, moduleId);
      console.log("Generated folder name:", folderName);
    } catch (folderError) {
      return res.status(400).json({
        error: folderError.message,
      });
    }

    // Handle file uploads
    const uploadedFiles = {};

    if (req.files && Object.keys(req.files).length > 0) {
      console.log(`Processing files for fields: ${Object.keys(req.files)}`);

      // Process note file
      if (req.files.note && req.files.note[0]) {
        const file = req.files.note[0];
        console.log(`Processing note file: ${file.originalname}`);

        try {
          const fileBuffer = fs.readFileSync(file.path);
          const gcsUrl = await uploadToGoogleCloud({
            folderName,
            file: fileBuffer,
            fileName: file.originalname,
            contentType: file.mimetype,
          });

          uploadedFiles.noteUrl = gcsUrl;
          console.log(`Note file uploaded successfully: ${gcsUrl}`);

          // Clean up temp file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          console.error(`Error uploading note file:`, uploadError);
          // Delete temp file even if upload fails
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(500).json({
            success: false,
            error: `Failed to upload note file: ${uploadError.message}`,
          });
        }
      }

      // Process video file
      if (req.files.video && req.files.video[0]) {
        const file = req.files.video[0];
        console.log(`Processing video file: ${file.originalname}`);

        try {
          const fileBuffer = fs.readFileSync(file.path);
          const gcsUrl = await uploadToGoogleCloudAndTranscode({
            folderName,
            file: fileBuffer,
            fileName: file.originalname,
            contentType: file.mimetype,
          });

          uploadedFiles.videoUrl = gcsUrl;
          console.log(`Video file uploaded successfully: ${gcsUrl}`);

          // Clean up temp file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          console.error(`Error uploading video file:`, uploadError);
          // Delete temp file even if upload fails
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(500).json({
            success: false,
            error: `Failed to upload video file: ${uploadError.message}`,
          });
        }
      }
    }

    console.log("Uploaded files:", uploadedFiles);

    // Validate that required files are present
    if (!uploadedFiles.noteUrl) {
      return res.status(400).json({ error: "Note file is required" });
    }
    // Allow: YouTube link OR uploaded video
    let finalVideoUrl = uploadedFiles.videoUrl || videoUrl;

    if (!finalVideoUrl) {
      return res.status(400).json({
        error:
          "Either a YouTube link (videoUrl) or a video file must be provided",
      });
    }

    // ADDED: Parse and process video metadata
    let parsedVideoMetadata = null;
    if (videoMetadata) {
      try {
        parsedVideoMetadata = JSON.parse(videoMetadata);
        console.log("Parsed video metadata:", parsedVideoMetadata);

        // Validate required metadata fields
        if (
          !parsedVideoMetadata.duration ||
          !parsedVideoMetadata.width ||
          !parsedVideoMetadata.height
        ) {
          console.warn("Incomplete video metadata provided");
        }
      } catch (parseError) {
        console.warn("Failed to parse video metadata:", parseError.message);
        // Continue without metadata if parsing fails
      }
    }

    // Create topic in database
    const topicData = {
      courseId,
      subjectId,
      moduleId,
      name,
      description: description || "",
      topicOrder: orderNumber, // Use the validated order number
      folderName,
      noteUrl: uploadedFiles.noteUrl,
      videoUrl: finalVideoUrl,
      isActive: isActive === "true" || isActive === true,
      transcodingStatus: "COMPLETED",
      // ADDED: Include video metadata
      videoMetadata: parsedVideoMetadata || {
        duration: 0,
        width: 0,
        height: 0,
        size: 0,
        type: "",
        name: "",
      },
    };

    console.log("Creating topic with data:", topicData);

    const topic = await Topic.create(topicData);

    res.status(201).json({
      success: true,
      message: "Topic created successfully",
      topic,
    });
  } catch (err) {
    console.error("Error in createTopic:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// ADDED: Update topic function to handle video metadata
export const updateTopic = async (req, res) => {
  try {
    console.log("=== UPDATE TOPIC REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const { id } = req.params;
    const {
      courseId,
      subjectId,
      moduleId,
      name,
      topicOrder,
      description,
      isActive,
      videoMetadata, // ADDED: Video metadata from frontend
    } = req.body;

    // Find existing topic
    const existingTopic = await Topic.findById(id);
    if (!existingTopic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Validate topicOrder cannot be 0 or negative
    const orderNumber = parseInt(topicOrder);
    if (orderNumber <= 0) {
      return res.status(400).json({
        success: false,
        error: "Topic order must be a positive number (greater than 0)",
      });
    }

    // Check if another topic already has the same courseId, subjectId, moduleId, and topicOrder
    if (
      courseId !== existingTopic.courseId.toString() ||
      subjectId !== existingTopic.subjectId.toString() ||
      moduleId !== existingTopic.moduleId.toString() ||
      orderNumber !== existingTopic.topicOrder
    ) {
      const duplicateTopic = await Topic.findOne({
        _id: { $ne: id }, // Exclude the current topic
        courseId,
        subjectId,
        moduleId,
        topicOrder: orderNumber,
      });

      if (duplicateTopic) {
        return res.status(409).json({
          success: false,
          error: `Another topic with order ${topicOrder} already exists in this module. Please use a different order number.`,
        });
      }
    }

    let folderName = existingTopic.folderName;

    // If course, subject, or module changed, regenerate folder name
    if (
      courseId !== existingTopic.courseId.toString() ||
      subjectId !== existingTopic.subjectId.toString() ||
      moduleId !== existingTopic.moduleId.toString()
    ) {
      try {
        folderName = await getFolderName(courseId, subjectId, moduleId);
        console.log("Regenerated folder name:", folderName);
      } catch (folderError) {
        return res.status(400).json({
          error: folderError.message,
        });
      }
    }

    // Handle file uploads
    const uploadedFiles = {
      noteUrl: existingTopic.noteUrl,
      videoUrl: existingTopic.videoUrl,
    };

    if (req.files && Object.keys(req.files).length > 0) {
      console.log(`Processing files for fields: ${Object.keys(req.files)}`);

      // Process note file if updated
      if (req.files.note && req.files.note[0]) {
        const file = req.files.note[0];
        console.log(`Processing updated note file: ${file.originalname}`);

        try {
          const fileBuffer = fs.readFileSync(file.path);
          const gcsUrl = await uploadToGoogleCloud({
            folderName,
            file: fileBuffer,
            fileName: file.originalname,
            contentType: file.mimetype,
          });

          uploadedFiles.noteUrl = gcsUrl;
          console.log(`Note file updated successfully: ${gcsUrl}`);

          // Clean up temp file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          console.error(`Error uploading note file:`, uploadError);
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(500).json({
            success: false,
            error: `Failed to upload note file: ${uploadError.message}`,
          });
        }
      }

      // Process video file if updated
      if (req.files.video && req.files.video[0]) {
        const file = req.files.video[0];
        console.log(`Processing updated video file: ${file.originalname}`);

        try {
          const fileBuffer = fs.readFileSync(file.path);
          const gcsUrl = await uploadToGoogleCloudAndTranscode({
            folderName,
            file: fileBuffer,
            fileName: file.originalname,
            contentType: file.mimetype,
          });

          uploadedFiles.videoUrl = gcsUrl;
          console.log(`Video file updated successfully: ${gcsUrl}`);

          // Clean up temp file
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          console.error(`Error uploading video file:`, uploadError);
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(500).json({
            success: false,
            error: `Failed to upload video file: ${uploadError.message}`,
          });
        }
      }
    }

    // ADDED: Parse and process video metadata
    let parsedVideoMetadata = existingTopic.videoMetadata;
    if (videoMetadata) {
      try {
        parsedVideoMetadata = JSON.parse(videoMetadata);
        console.log("Updated video metadata:", parsedVideoMetadata);
      } catch (parseError) {
        console.warn("Failed to parse video metadata:", parseError.message);
        // Keep existing metadata if parsing fails
      }
    }

    // Update topic in database
    const updateData = {
      courseId,
      subjectId,
      moduleId,
      name,
      description: description || "",
      topicOrder: orderNumber, // Use the validated order number
      folderName,
      noteUrl: uploadedFiles.noteUrl,
      videoUrl: uploadedFiles.videoUrl,
      isActive: isActive === "true" || isActive === true,
      // ADDED: Update video metadata
      videoMetadata: parsedVideoMetadata,
    };

    console.log("Updating topic with data:", updateData);

    const updatedTopic = await Topic.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Topic updated successfully",
      topic: updatedTopic,
    });
  } catch (err) {
    console.error("Error in updateTopic:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    console.log("=== DELETE TOPIC REQUEST ===");
    console.log("Topic ID:", topicId);

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Delete files from Google Cloud
    try {
      if (topic.noteUrl) {
        await deleteFromGoogleCloud(topic.noteUrl);
        console.log(`Deleted note file: ${topic.noteUrl}`);
      }
      if (topic.videoUrl) {
        await deleteFromGoogleCloud(topic.videoUrl);
        console.log(`Deleted video file: ${topic.videoUrl}`);
      }
    } catch (deleteError) {
      console.error("Error deleting files from Google Cloud:", deleteError);
      // Continue with topic deletion even if file deletion fails
    }

    await Topic.findByIdAndDelete(topicId);

    res.status(200).json({
      success: true,
      message: "Topic deleted successfully",
    });
  } catch (err) {
    console.error("Error in deleteTopic:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getTopicById = async (req, res) => {
  try {
    const topicId = req.params.id;
    const topic = await Topic.findById(topicId)
      .populate("courseId", "name")
      .populate("subjectId", "subjectName")
      .populate("moduleId", "name");

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.status(200).json({
      success: true,
      message: "Topic found",
      topic,
    });
  } catch (err) {
    console.error("Error in getTopicById:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getAllTopics = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const from = req.query.from;
    const to = req.query.to;

    let query = {};

    // Search functionality
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ name: searchRegex }, { description: searchRegex }];

      if (!isNaN(Number(search))) {
        query.$or.push({ topicOrder: Number(search) });
      }
    }

    // Date range filters
    const now = new Date();
    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "week") {
      const first = now.getDate() - now.getDay();
      const start = new Date(now.setDate(first));
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "custom" && from && to) {
      query.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }

    // Fetch topics with population
    let topicsQuery = Topic.find(query)
      .populate("courseId", "name")
      .populate("subjectId", "subjectName")
      .populate("moduleId", "name")
      .sort({ createdAt: -1 });

    let total = null;
    if (page && limit) {
      total = await Topic.countDocuments(query);
      topicsQuery = topicsQuery.skip((page - 1) * limit).limit(limit);
    }

    const topics = await topicsQuery;

    // Response
    if (page && limit) {
      return res.status(200).json({
        success: true,
        data: topics,
        total,
        page,
        limit,
      });
    } else {
      return res.status(200).json({
        success: true,
        data: topics,
      });
    }
  } catch (error) {
    console.error("Error in getAllTopics:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getTopicByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    const topics = await Topic.find({ courseId })
      .populate("courseId", "name")
      .populate("subjectId", "subjectName")
      .populate("moduleId", "name")
      .sort({ topicOrder: 1 });

    if (topics.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No topics found for this course",
      });
    }

    res.status(200).json({
      success: true,
      message: "Topics fetched successfully",
      topics,
      count: topics.length,
    });
  } catch (error) {
    console.error("Error in getTopicByCourseId:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
