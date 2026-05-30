import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  paymentType: { type: String, enum: ["course", "test", "category"], required: true },
  paymentForId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemName: { type: String, default: null },
  amount: { type: Number, required: true },
  transactionId: { type: String, unique: true },       // Razorpay order_id
  razorpayPaymentId: { type: String, default: null },  // Razorpay payment_id (after success)
  status: { type: String, enum: ["success", "failed", "pending"], default: "pending" },
  paymentGateway: { type: String, default: "razorpay" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Payment", PaymentSchema);
