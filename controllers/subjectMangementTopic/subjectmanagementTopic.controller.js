
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import subjectManagement from "../../models/subjectManagement.model.js";
import moduleManagement from "../../models/moduleManagement.model.js"
import topicMangagement from "../../models/topicManagement.model.js"
import {
  getPresignedUrl,
} from "../../utils/uploadTos3Function.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, "../../uploads");

const getFolderName = async (subjectId, moduleId) => {
  const subject = await subjectManagement.findById(subjectId);
  const module = await moduleManagement.findById(moduleId);
  if (!subject || !module) throw new Error("Invalid IDs provided");
  return `${subject.subjectName}/${module.name}`.replace(/\s+/g, "-");
};

export const createTopicManagement = async (req, res) => {
  try {
    const { subjectId, moduleId, name, description, topicOrder,noteUrl ,videoUrl } = req.body;
    const folderName = await getFolderName(subjectId, moduleId);
    const topic = await topicMangagement.create({
      subjectId,
      moduleId,
      name,
      description,
      topicOrder,
      folderName,
      noteUrl,
      videoUrl,
    });

    res.status(200).json({ message: "Topic created", topic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllTopicsManagement = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const from = req.query.from;
    const to = req.query.to;

    let query = {};

    // Search by name, description, or topicOrder if search is a number
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];

      if (!isNaN(Number(search))) {
        query.$or.push({ topicOrder: Number(search) });
      }
    }

    // Date range filters
    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "week") {
      const now = new Date();
      const first = now.getDate() - now.getDay();
      const start = new Date(now.setDate(first));
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "year") {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter === "custom" && from && to) {
      query.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }

    if (page && limit) {
      const total = await topicMangagement.countDocuments(query);
      const data = await topicMangagement.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const dataWithUrls = await Promise.all(
        data.map(async (doc) => {
          const obj = doc.toObject();
          const videoUrl = obj.videoUrl ? await getPresignedUrl(obj.videoUrl) : null;
          const noteUrl = obj.noteUrl ? await getPresignedUrl(obj.noteUrl) : null;
          return {
            ...obj,
            videoUrl,
            noteUrl,
          };
        })
      );

      return res.status(200).json({ data: dataWithUrls, total });
    } else {
      const data = await Topic.find(query).sort({ createdAt: -1 });

      const dataWithUrls = await Promise.all(
        data.map(async (doc) => {
          const obj = doc.toObject();
          const videoUrl = obj.videoUrl ? await getPresignedUrl(obj.videoUrl) : null;
          const noteUrl = obj.noteUrl ? await getPresignedUrl(obj.noteUrl) : null;
          return {
            ...obj,
            videoUrl,
            noteUrl,
          };
        })
      );

      return res.status(200).json(dataWithUrls);
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};