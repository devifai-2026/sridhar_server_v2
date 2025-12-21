import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      enum: ["new", "important", "info"],
      required: true,
    },
    header: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageURL: {
      type: String,
      default: null,
    },
    hyperlinkEnabled:{
      type: Boolean,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
