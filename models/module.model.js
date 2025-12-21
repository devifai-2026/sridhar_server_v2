import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const moduleSchema = new Schema(
  {
    courseId: {
      type: Types.ObjectId,
      ref: "Course",
      required: true,
    },
    subjectId:{
        type: Types.ObjectId,
        ref: "Subject",
        required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    order: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

const Module = model("Module", moduleSchema);

export default Module;