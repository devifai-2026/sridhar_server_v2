import Subject from "../../models/subject.model.js"
import Module from "../../models/module.model.js"
import Topic from "../../models/topic.model.js"


export const getAllSubjects = async (req, res) => {
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
        { subjectName: searchRegex },
        { description: searchRegex },
      ];

      // Add numberOfModules filter only if search is a valid number
      if (!isNaN(Number(search))) {
        query.$or.push({ numberOfModules: Number(search) });
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
      const total = await Subject.countDocuments(query);
      // Return paginated results
      const data = await Subject.find(query)
        .populate("courseId", "name") // Populate course name
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return res.status(200).json({ data, total });
    } else {
      // No pagination params - return all matching data at once
      const data = await Subject.find(query)
        .populate("courseId", "name") // Populate course name
        .sort({ createdAt: -1 });
      return res.status(200).json(data);
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}



export const createSubject = async (req, res) => {
  try {
    const { courseId, subjectName, description, numberOfModules, photo, isActive } = req.body;


    const newSubject = new Subject({
      courseId,
      subjectName,
      description,
      photo,
      numberOfModules,
      isActive,
    });

    await newSubject.save();
    res.status(201).json({ message: "Subject created successfully", subject: newSubject });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const updated = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json({ message: "Subject updated successfully", updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { deleteType } = req.body;
    const subjectId = req.params.id;
    let result;

    if (deleteType === "hard") {
      // Delete course
      result = await Subject.findByIdAndDelete(subjectId);
      if (!result) {
        return res.status(404).json({ error: "Subject not found" });
      }

      // Delete all  modules, and topics associated with the course

      await Module.deleteMany({ subjectId });
      await Topic.deleteMany({ subjectId });

      return res.status(200).json({ message: "Subject hard deleted successfully" });
    } else {
      result = await Subject.findByIdAndUpdate(
        subjectId,
        { isActive: false },
        { new: true }
      );
      if (!result) {
        return res.status(404).json({ error: "Subject not found" });
      }
      await Module.updateMany({ subjectId }, { isActive: false });
      await Topic.updateMany({ subjectId }, { isActive: false });

      return res.status(200).json({ message: "Subject soft deleted (isActive: false)" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }

}

export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json({ message: "subject found", subject });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSubjectByCourseId = async (req, res) => {
  try {
    const subjects = await Subject.find({ courseId: req.params.courseId });
    if (!subjects || subjects.length === 0) {
      return res.status(404).json({ message: "No subjects found for this course" });
    }
    res.status(200).json({ message: "Subjects fetched successfully", subjects });
  } catch (error) {
    console.error("Error fetching subjects by course ID:", error);
    res.status(500).json({ error: error.message });
  }
}
