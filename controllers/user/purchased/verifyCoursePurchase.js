// controllers/userController.js

import CourseAccess from "../../../models/courseAccess.model.js";
import MockTestAccess from "../../../models/mockTestAccess.js";
export const checkIfPurchased = async (req, res) => {
  try {
    const { courseId, userId } = req.params;

    // Find access record
    const access = await CourseAccess.findOne({
      courseId,
      userId
    });

    // If no record found → not purchased
    if (!access) {
      return res.json({ purchased: false });
    }

    // If expired → not purchased
    const isExpired = access.endDate < new Date();

    return res.json({
      purchased: !isExpired,
      expired: isExpired,
      startDate: access.startDate,
      endDate: access.endDate
    });

  } catch (err) {
    console.error("checkIfPurchased error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const getMockTestAccess = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ success: false, message: "userId missing" });

    // Fetch all mock tests user has purchased
    const accessList = await MockTestAccess.find({ userId });

    return res.json({
      success: true,
      count: accessList.length,
      tests: accessList.map((item) => ({
        mockTestId: item.mockTestId,
        isCompleted: item.isCompleted,
      })),
    });

  } catch (err) {
    console.error("getMockTestAccess error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
