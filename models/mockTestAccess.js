import mongoose from "mongoose";

const MockTestAccessSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  mockTestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MockTest",
    required: true,
  },
  isCompleted: { 
    type: Boolean, 
    default: false 
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  testResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MockTestResult"
  },
  transactionId: {
    type: String
  },
  // Add these for category purchases
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MocktestCategory"
  },
  purchasedVia: {
    type: String,
    enum: ["individual", "category", "bundle"],
    default: "individual"
  }
}, {
  timestamps: true
});

// Indexes
MockTestAccessSchema.index({ userId: 1, mockTestId: 1, createdAt: 1 });
MockTestAccessSchema.index({ userId: 1, categoryId: 1 });
MockTestAccessSchema.index({ transactionId: 1 });
MockTestAccessSchema.index({ userId: 1, purchasedVia: 1 });

export default mongoose.model("MockTestAccess", MockTestAccessSchema);