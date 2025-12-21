import e from "express";
import Module from "../../models/module.model.js"
import Subject from "../../models/subject.model.js"
import Topic from "../../models/topic.model.js"

export const createModule = async (req, res) => {
  try {
    const { courseId, subjectId, name, description, image, order,isActive } = req.body;
    const newModule = new Module({
      courseId,
      subjectId,
      name,
      description,
      image,
      order,
      isActive,
    });
    await newModule.save();

    const moduleCount = await Module.countDocuments({ subjectId });

    await Subject.findByIdAndUpdate(
      subjectId,
      { numberOfModules: moduleCount },
      { new: true }
    );

    // Send success response and return to ensure no further code runs
    return res.status(201).json({
      message: "Module created successfully",
      newModule,
      updatedModuleCount: moduleCount,
    });

  } catch (err) {
    // Send error response and return
    return res.status(500).json({ error: err.message });
  }
};


export const getAllModules = async (req, res) => {
  try {
    // Check if page and limit exist in query; if not, return all data
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const from = req.query.from;
    const to = req.query.to;

    let query = {};

    // Name search
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];

      if (!isNaN(Number(search))) {
        query.$or.push({ order: Number(search) });
      }
    }

    // Filter by date range (same as before)
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
      // Total count before pagination
      const total = await Module.countDocuments(query);
      // Return paginated results
      const data = await Module.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return res.status(200).json({ data, total });
    } else {
      // No pagination params - return all matching data at once
      const data = await Module.find(query).sort({ createdAt: -1 });
      return res.status(200).json(data);
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const updated = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Module not found" });
    res.status(200).json({ message: "Module updated successfully", updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const { deleteType } = req.body;
    const moduleId = req.params.id;
    let result;

    if (deleteType === "hard") {
      // Delete course
      result = await Module.findByIdAndDelete(moduleId);
      if (!result) {
        return res.status(404).json({ error: "Module not found" });
      }

      // Delete all topics associated with the module
      await Topic.deleteMany({ moduleId });

      return res.status(200).json({ message: "Module hard deleted successfully" });
    } else {
      result = await Module.findByIdAndUpdate(
        moduleId,
        { isActive: false },
        { new: true }
      );
      if (!result) {
        return res.status(404).json({ error: "Module not found" });
      }

      await Topic.updateMany({ moduleId }, { isActive: false });

      return res.status(200).json({ message: "Module soft deleted (isActive: false)" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id)
    if (!module) return res.status(404).json({ error: "Module not found" });
    res.status(200).json({ message: "Mdule found", module });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getModuleByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    const modules = await Module.find({ courseId });
    if (modules.length === 0) {
      return res.status(404).json({ error: "No modules found for this courseId" });
    }
    res.status(200).json({ message: "Modules fetched successfully", modules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getModuleBySubjectId = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const modules = await Module.find({ subjectId });
    if (modules.length === 0) {
      return res.status(404).json({ error: "No modules found for this subjectId" });
    }
    res.status(200).json({ message: "Modules fetched successfully", modules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}