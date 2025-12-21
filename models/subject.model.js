import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const subjectSchema = new Schema(
  {
    courseId: {
      type: Types.ObjectId,
      ref: "Course",
      required: true,
    },
    subjectName: { type: String, required: true },
    description: { type: String, required: true },
    photo:{type: String, required: true},
    numberOfModules: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

const Subject = model("Subject", subjectSchema);

export default Subject;
