import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

const MockTestSchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: String,
    category: String,
    subject: String,
    mockTestType: String,
    isPaid: {
      type: Boolean,
      default: false
    },
    price: {
      type: Number,
      default: 0
    },
    requiresCode: {
      type: Boolean,
      default: false
    },
    validCodes: [String],
    totalQuestions: Number,
    durationMinutes: Number,
    questionIds: [{
      type: Types.ObjectId,
      ref: "MockTestQuestion",
    }],
    createdBy: { type: Types.ObjectId, required: true, ref: "Admin" },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);



const MockTest = mongoose.models.MockTest || mongoose.model("MockTest", MockTestSchema);

export default MockTest;
