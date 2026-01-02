import Course from "../../../models/course.model.js";
import Subject from "../../../models/subject.model.js";
import Module from "../../../models/module.model.js";
import Topic from "../../../models/topic.model.js"
import mongoose from "mongoose";

// Create a new course
export const createCourse = async (req, res) => {
  try {
    const course = new Course(req.body);
    const savedCourse = await course.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all courses
export const getCourses = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const from = req.query.from;
    const to = req.query.to;

    let query = {};

    // Search functionality (keep as is)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];

      if (!isNaN(Number(search))) {
        const numericSearch = Number(search);
        query.$or.push(
          { duration: numericSearch },
          { totalChapters: numericSearch },
          { totalTopics: numericSearch },
          { originalPrice: numericSearch },
          { discountedPrice: numericSearch }
        );
      }
    }

    // MODIFIED DATE RANGE FILTERS USING _id
    const now = new Date();
    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query._id = {
        $gte: mongoose.Types.ObjectId.createFromTime(start.getTime() / 1000),
        $lte: mongoose.Types.ObjectId.createFromTime(end.getTime() / 1000)
      };
    } else if (filter === "week") {
      const first = now.getDate() - now.getDay();
      const start = new Date(now.setDate(first));
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query._id = {
        $gte: mongoose.Types.ObjectId.createFromTime(start.getTime() / 1000),
        $lte: mongoose.Types.ObjectId.createFromTime(end.getTime() / 1000)
      };
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
      query._id = {
        $gte: mongoose.Types.ObjectId.createFromTime(start.getTime() / 1000),
        $lte: mongoose.Types.ObjectId.createFromTime(end.getTime() / 1000)
      };
    } else if (filter === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      query._id = {
        $gte: mongoose.Types.ObjectId.createFromTime(start.getTime() / 1000),
        $lte: mongoose.Types.ObjectId.createFromTime(end.getTime() / 1000)
      };
    } else if (filter === "custom" && from && to) {
      const startDate = new Date(from);
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      query._id = {
        $gte: mongoose.Types.ObjectId.createFromTime(startDate.getTime() / 1000),
        $lte: mongoose.Types.ObjectId.createFromTime(endDate.getTime() / 1000)
      };
    }

    // Fetch courses with population
    let coursesQuery = Course.find(query)
      .populate("CreatedBy", "username email")
      .sort({ _id: -1 }); // Sort by _id instead of createdAt

    let total = null;
    if (page && limit) {
      total = await Course.countDocuments(query);
      coursesQuery = coursesQuery.skip((page - 1) * limit).limit(limit);
    }

    const courses = await coursesQuery;

    // Response
    if (page && limit) {
      return res.status(200).json({
        success: true,
        data: courses,
        total,
        page,
        limit,
      });
    } else {
      return res.status(200).json({
        success: true,
        data: courses,
      });
    }
  } catch (error) {
    console.error("Error in getCourses:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};





// Get course by ID
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update course by ID
export const updateCourse = async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.status(200).json(updatedCourse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete course by ID
export const deleteCourse = async (req, res) => {
  try {
    const { deleteType } = req.body;
    const courseId = req.params.id;
    let result;

    if (deleteType === "hard") {
      // Delete course
      result = await Course.findByIdAndDelete(courseId);
      if (!result) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Delete all subjects, modules, and topics associated with the course
      await Subject.deleteMany({ courseId });
      await Module.deleteMany({ courseId });
      await Topic.deleteMany({ courseId });

      return res.status(200).json({ message: "Course hard deleted successfully" });
    } else {
      // Soft delete course
      result = await Course.findByIdAndUpdate(
        courseId,
        { isActive: false },
        { new: true }
      );
      if (!result) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Soft delete all subjects, modules, and topics associated with the course
      await Subject.updateMany({ courseId }, { isActive: false });
      await Module.updateMany({ courseId }, { isActive: false });
      await Topic.updateMany({ courseId }, { isActive: false });

      return res.status(200).json({ message: "Course soft deleted (isActive: false)" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

