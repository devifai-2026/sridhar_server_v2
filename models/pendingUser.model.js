// models/pendingUser.model.js
import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  deviceId: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, default: () => Date.now() + 10 * 60 * 1000 }, // expires in 10 mins
});

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
export default PendingUser;
