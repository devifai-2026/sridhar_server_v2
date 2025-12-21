// models/CourseAccess.js
import mongoose from "mongoose";

const CourseAccessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },

  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true }, // calculated from course.duration

  isExpired: { type: Boolean, default: false }
});

export default mongoose.model("CourseAccess", CourseAccessSchema);
