import mongoose from "mongoose";

const deviceChangeRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  PreviousDeviceId: {
    type: String,
    required: true,
  },
  newDeviceId: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin", // assuming admins are also in User model
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const DeviceChangeRequest = mongoose.model("DeviceChangeRequest", deviceChangeRequestSchema);
export default DeviceChangeRequest;
