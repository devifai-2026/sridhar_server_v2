import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const chapterSchema = new Schema(
  {
    chapterName: { type: String, required: true },
    description: { type: String, required: true },
    courseId: {
      type: Types.ObjectId,
      ref: "Course",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Chapter = model("Chapter", chapterSchema);

export default Chapter;
