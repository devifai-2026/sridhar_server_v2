import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const topicSchema = new Schema(
  {
    courseId: {
      type: Types.ObjectId,
      ref: "Course",
      required: true,
    },
    subjectId: {
      type: Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    moduleId: {
      type: Types.ObjectId,
      ref: "Module",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    noteUrl: { type: String, required: true },
    videoUrl: { type: String, required: true },
    hlsUrl: { type: String, require: false, default: "" },
    folderName: { type: String, required: true },
    topicOrder: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true },
    transcodingStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING'
    },
    mediaConvertJobId: String,
    // ADDED: Video metadata fields
    videoMetadata: {
      duration: { type: Number, default: 0 }, // Duration in seconds
      width: { type: Number, default: 0 },    // Video width in pixels
      height: { type: Number, default: 0 },   // Video height in pixels
      size: { type: Number, default: 0 },     // File size in bytes
      type: { type: String, default: "" },    // MIME type (e.g., "video/mp4")
      name: { type: String, default: "" },    // Original file name
      bitrate: { type: Number, default: 0 },  // Optional: Video bitrate
      framerate: { type: Number, default: 0 } // Optional: Frames per second
    }
  },
  { timestamps: true }
);

const Topic = model("Topic", topicSchema);

export default Topic;