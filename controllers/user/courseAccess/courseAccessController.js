// controllers/courseAccessController.js
import CourseAccess from "../../../models/courseAccess.model.js";
import mockTestAccess from "../../../models/mockTestAccess.js";

// CREATE Course Access
export const createCourseAccess = async (req, res) => {
  try {
    const access = new CourseAccess(req.body);
    await access.save();
    res.status(201).json(access);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET all access by USER ID
export const getCourseAccessByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Fetch course access
    const courseAccessList = await CourseAccess.find({
      userId: userId,
    }).populate("courseId");

    const courses = courseAccessList.map((access) => ({
      id: access.courseId._id,
      name: access.courseId.name,
      image: access.courseId.courseImgUrl ?? "",
      duration: access.courseId.duration ?? 0,
      originalPrice: access.courseId.originalPrice ?? 0,
      discountedPrice: access.courseId.discountedPrice ?? 0,
      purchasedAt: formatDate(access.startDate),
      expiresAt: formatDate(access.endDate),
      isExpired: access.isExpired,
    }));

    // Fetch mock test access
    const mockTestAccessList = await mockTestAccess.find({
      userId: userId,
    })
    .populate("mockTestId")
    .populate("testResultId") // Add this to get test results
    .sort({ createdAt: -1 });
    
    console.log("Total purchases found:", mockTestAccessList.length);
    console.log("Purchases by test ID:");
    mockTestAccessList.forEach((access, index) => {
      console.log(`[${index + 1}] Test: ${access.mockTestId.title}, ID: ${access.mockTestId._id}, Completed: ${access.isCompleted}, Date: ${access.createdAt}`);
    });

    // Create array of ALL purchases (not grouped)
    const mockTests = mockTestAccessList.map((access) => {
      const test = access.mockTestId;
      
      // Determine status text
      let extra = "";
      if (access.isCompleted && access.testResultId) {
        extra = `Completed - Score: ${access.testResultId.score || 0}%`;
      } else if (access.isCompleted) {
        extra = "Completed";
      } else {
        extra = "Not attempted yet";
      }
      
      return {
        id: test._id,
        _id: test._id, // Add this line - include both fields
        title: test.title,
        description: test.description || "",
        price: test.price || 0,
        totalQuestions: test.totalQuestions || 0,
        durationMinutes: test.durationMinutes || 0,
        purchasedAt: formatDate(access.purchaseDate || access.createdAt),
        purchaseId: access._id, // Add purchase ID to distinguish different purchases
        isCompleted: access.isCompleted,
        isPaid: test.isPaid || false,
        testResultId: access.testResultId?._id,
        testResultScore: access.testResultId?.score,
        status: access.isCompleted ? "Completed" : "Active",
        extra: extra,
        // Add purchase-specific info
        transactionId: access.transactionId,
        purchaseDate: access.purchaseDate,
        createdAt: access.createdAt,
      };
    });

    console.log({
      coursesCount: courses.length,
      mockTestsCount: mockTests.length, // Should be 5 in your case
    });

    console.log("Mock tests sent:", mockTests.map(t => ({ 
      title: t.title, 
      purchaseId: t.purchaseId,
      isCompleted: t.isCompleted,
      extra: t.extra 
    })));

    return res.json({
      courses,
      studySubjects: [],
      mockTests,
    });
  } catch (err) {
    console.error("Error in getCourseAccessByUser:", err);
    return res.status(400).json({ error: err.message });
  }
};

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  if (!date) return "";

  // If it's a string, convert to Date object first
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Format as YYYY-MM-DD
  return dateObj.toISOString().split("T")[0];
};

// Alternative helper function for DD-MM-YYYY format
const formatDateDDMMYYYY = (date) => {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
};

// Alternative helper function for more readable format
const formatDateReadable = (date) => {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return dateObj.toLocaleDateString("en-US", options);
};

// GET access by COURSE ID
export const getCourseAccessByCourseId = async (req, res) => {
  try {
    const access = await CourseAccess.findOne({
      userId: req.params.userId,
      courseId: req.params.courseId,
    }).populate("courseId");

    res.json(access);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// UPDATE Access
export const updateCourseAccess = async (req, res) => {
  try {
    const updated = await CourseAccess.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE Access
export const deleteCourseAccess = async (req, res) => {
  try {
    await CourseAccess.findByIdAndDelete(req.params.id);
    res.json({ message: "Access removed" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
