import Course from "../../../models/course.model.js";
import Subject from "../../../models/subject.model.js";
import Module from "../../../models/module.model.js";
import Topic from "../../../models/topic.model.js"


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
        query.$or.push({ duration: Number(search) });
      }
    }


    if (typeof totalChapters === 'number') {
      query.totalChapters = totalChapters;
    }

    if (typeof totalTopics === 'number') {
      query.totalTopics = totalTopics;
    }

    if (typeof isActive === 'boolean') {
      query.isActive = isActive;
    }

    if (typeof discountedPrice === 'number') {
      query.discountedPrice = discountedPrice;
    }

    if (typeof originalPrice === 'number') {
      query.originalPrice = originalPrice;
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
      const total = await Course.countDocuments(query);
      // Return paginated results
      const data = await Course.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return res.status(200).json({ data, total });
    } else {
      // No pagination params - return all matching data at once
      const data = await Course.find(query).sort({ createdAt: -1 });
      return res.status(200).json(data);
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
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

