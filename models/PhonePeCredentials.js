import mongoose from "mongoose";

const phonePeSchema = new mongoose.Schema(
  {
    type: { type: String, default: "UAT" },
    clientId: { type: String, required: true },
    clientSecret: { type: String, required: true },
    clientVersion: { type: String, required: true },
    isActive: { type: Boolean,  default: false },
  },
  { timestamps: true }
);

export default mongoose.model("PhonePeCredentials", phonePeSchema);
