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
  // Add these fields for better tracking
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  // Reference to the test result if completed
  testResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MockTestResult"
  },
  // Transaction ID or payment reference
  transactionId: {
    type: String
  }
}, {
  timestamps: true
});

// Remove unique constraint to allow multiple purchases
// Create compound index for better querying
MockTestAccessSchema.index({ userId: 1, mockTestId: 1, createdAt: 1 });

export default mongoose.model("MockTestAccess", MockTestAccessSchema);