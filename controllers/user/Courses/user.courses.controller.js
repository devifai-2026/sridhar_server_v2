import mongoose from "mongoose";
import Course from "../../../models/course.model.js";
import Module from "../../../models/module.model.js";
import Topic from "../../../models/topic.model.js";
import Subject from "../../../models/subject.model.js";
import { getPresignedUrl } from "../../../utils/uploadTos3Function.js";

export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).select(
      "name description totalTopics courseImgUrl"
    );
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCourseDetailsById = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    // Find course and ensure it's active
    const course = await Course.findOne({
      _id: courseId,
      isActive: true,
    }).select(
      "name description totalTopics courseImgUrl originalPrice discountedPrice isCouponCode couponCode duration"
    );

    if (!course) {
      return res.status(404).json({ error: "Course not found or inactive" });
    }

    // Fetch active subjects for the course
    const subjects = await Subject.find({ courseId, isActive: true }).lean();

    // For each subject, fetch modules and topic count per module
    for (let subject of subjects) {
      const modules = await Module.find({
        courseId,
        subjectId: subject._id,
        isActive: true,
      }).lean();

      // Add topicCount for each module
      for (let module of modules) {
        const topicCount = await Topic.countDocuments({
          moduleId: module._id,
          isActive: true,
        });
        module.topicCount = topicCount;
      }

      subject.modules = modules;
      // Optionally total topics in subject
      subject.totalTopics = modules.reduce(
        (sum, mod) => sum + mod.topicCount,
        0
      );
    }

    // Total modules and topics for the course
    const moduleCount = await Module.countDocuments({
      courseId,
      isActive: true,
    });
    const topicCount = await Topic.countDocuments({ courseId, isActive: true });

    res.status(200).json({
      course,
      moduleCount,
      topicCount,
      subjects,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTopicsByModule = async (req, res) => {
  try {
    const { courseId, subjectId, moduleId } = req.params;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !mongoose.Types.ObjectId.isValid(moduleId)
    ) {
      return res.status(400).json({ error: "Invalid IDs provided" });
    }

    // Fetch topics for this module
    const topics = await Topic.find({
      courseId,
      subjectId,
      moduleId,
      isActive: true,
    }).sort({ topicOrder: 1 });

    console.log("📊 Found topics:", topics.length);

    // Add URLs for videos and notes - FIXED: Use individual topic object
    const topicsWithUrls = await Promise.all(
      topics.map(async (topic) => {
        const obj = topic.toObject();

        return {
          ...obj,
          videoUrl: obj.videoUrl, // Use obj.videoUrl instead of topics.videoUrl
          noteUrl: obj.noteUrl, // Use obj.noteUrl instead of topics.noteUrl
          // The URLs are already in the document, no need to regenerate
        };
      })
    );

    console.log("✅ Successfully processed topics with streaming URLs");
    res.status(200).json({ data: topicsWithUrls });
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getCurrentCoursePrice = async (req, res) => {
  try {
    const { courseId, couponCode } = req.body;
    console.log({ courseId, couponCode });
    // Validate input
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing courseId",
      });
    }

    // Fetch course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const originalPrice = course.originalPrice;
    let payableAmount = course.discountedPrice;
    let isCouponApplied = false;

    // If coupon is empty → return default prices
    if (!couponCode || couponCode.trim() === "") {
      return res.status(200).json({
        success: true,
        data: {
          originalPrice,
          payableAmount,
          isCouponApplied: false,
        },
      });
    }

    // Find coupon inside course.couponCode array
    const appliedCoupon = course.couponCode?.find(
      (c) => c.couponCode.toLowerCase() === couponCode.trim().toLowerCase()
    );

    if (!appliedCoupon) {
      return res.status(200).json({
        success: false,
        message: "Invalid or inactive coupon code",
        data: {
          originalPrice,
          payableAmount: course.discountedPrice,
          isCouponApplied: false,
        },
      });
    }

    // Use discountedPrice from coupon object
    payableAmount = appliedCoupon.discountedPrice;
    isCouponApplied = true;

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        originalPrice,
        payableAmount,
        isCouponApplied,
      },
    });
  } catch (error) {
    console.error("Error in getCurrentCoursePrice:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const searchCourses = async (req, res) => {
  try {
    const { search } = req.query;

    console.log("🔍 Course Search Query:", search);

    // Validate input
    if (!search || search.trim() === "") {
      return res.status(400).json({
        message: "Search keyword is required",
        count: 0,
        data: [],
      });
    }

    // Build case-insensitive search query
    const courses = await Course.find({
      isActive: true,
      name: { $regex: search.trim(), $options: "i" },
    })
      .select(
        "name duration description originalPrice discountedPrice courseImgUrl totalChapters totalTopics isCouponCode"
      )
      .sort({ createdAt: -1 });

    // Success response
    return res.status(200).json({
      message: courses.length ? "Courses fetched successfully" : "No courses found",
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("❌ Course Search Error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      count: 0,
      data: [],
    });
  }
};