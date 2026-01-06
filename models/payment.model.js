// models/Payment.js
import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  paymentType: { 
    type: String, 
    enum: ["course", "test", "category"], 
    required: true 
  },

  paymentForId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },

  amount: { type: Number, required: true },
  transactionId: { type: String, unique: true },
  status: { type: String, enum: ["success", "failed", "pending"], default: "pending" },

  paymentGateway: { type: String, default: "phonepe" },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Payment", PaymentSchema);
