import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../../../models/payment.model.js";
import Course from "../../../models/course.model.js";
import CourseAccess from "../../../models/courseAccess.model.js";
import MockTest from "../../../models/mockTest.model.js";
import mockTestAccess from "../../../models/mockTestAccess.js";
import MocktestCategory from "../../../models/mocktestCategory.model.js";
import mongoose from "mongoose";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// =============================
// CREATE RAZORPAY ORDER
// =============================
export const createPaymentOrder = async (req, res) => {
  try {
    const { userId, paymentType, paymentForId } = req.body;

    if (!userId || !paymentType || !paymentForId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, paymentType, paymentForId)",
      });
    }

    let amount = 0;
    let itemName = "";

    if (paymentType === "course") {
      const course = await Course.findById(paymentForId);
      if (!course) return res.status(404).json({ success: false, message: "Course not found" });
      amount = Math.round(course.discountedPrice * 100);
      itemName = course.title || course.name;
    } else if (paymentType === "test") {
      const mockTest = await MockTest.findById(paymentForId);
      if (!mockTest) return res.status(404).json({ success: false, message: "Mock Test not found" });
      amount = Math.round(mockTest.price * 100);
      itemName = mockTest.title;
    } else if (paymentType === "category") {
      const category = await MocktestCategory.findById(paymentForId);
      if (!category) return res.status(404).json({ success: false, message: "Category not found" });
      const existing = await Payment.findOne({ userId, paymentType: "category", paymentForId, status: "success" });
      if (existing) return res.status(400).json({ success: false, message: "Already purchased" });
      amount = Math.round(category.price * 100);
      itemName = category.name;
    } else {
      return res.status(400).json({ success: false, message: "Invalid paymentType" });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount. Item might be free." });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId, paymentType, paymentForId, itemName },
    });

    await Payment.create({
      userId,
      paymentType,
      paymentForId,
      itemName,
      amount: amount / 100,
      transactionId: order.id,
      status: "pending",
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      itemName,
    });
  } catch (err) {
    console.error("❌ Create Order Error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// =============================
// VERIFY PAYMENT SIGNATURE
// =============================
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({ transactionId: razorpay_order_id });
    if (!payment) return res.status(404).json({ success: false, message: "Payment record not found" });

    payment.status = "success";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    // Grant access based on payment type
    if (payment.paymentType === "course") {
      const course = await Course.findById(payment.paymentForId);
      const months = course?.duration || 12;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);
      await CourseAccess.create({
        userId: payment.userId,
        courseId: payment.paymentForId,
        startDate,
        endDate,
      });
    } else if (payment.paymentType === "test") {
      await mockTestAccess.create({
        userId: payment.userId,
        mockTestId: payment.paymentForId,
        isCompleted: false,
        transactionId: razorpay_order_id,
        purchaseDate: new Date(),
      });
    } else if (payment.paymentType === "category") {
      const category = await MocktestCategory.findById(payment.paymentForId).populate("mocktestIds", "_id");
      if (category?.mocktestIds?.length) {
        const records = category.mocktestIds.map((test) => ({
          userId: payment.userId,
          mockTestId: test._id,
          isCompleted: false,
          transactionId: razorpay_order_id,
          purchaseDate: new Date(),
          categoryId: payment.paymentForId,
          purchasedVia: "category",
        }));
        await mockTestAccess.insertMany(records);
      }
    }

    return res.json({ success: true, message: "Payment verified and access granted" });
  } catch (err) {
    console.error("❌ Verify Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// =============================
// PAYMENT HISTORY
// =============================
export const getPaymentHistory = async (req, res) => {
  try {
    const { userId, paymentForId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    let paymentForObjectId = null;

    if (paymentForId) {
      try {
        paymentForObjectId = new mongoose.Types.ObjectId(paymentForId);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid paymentForId format" });
      }
    }

    let query = { userId: userObjectId };
    if (paymentForObjectId) query.paymentForId = paymentForObjectId;

    let payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate("paymentForId", "name title")
      .lean();

    if (!payments || payments.length === 0) {
      const testAccessQuery = { userId: userObjectId };
      if (paymentForObjectId) testAccessQuery.mockTestId = paymentForObjectId;

      const mockTestAccessRecords = await mockTestAccess
        .find(testAccessQuery)
        .sort({ purchaseDate: -1 })
        .populate("mockTestId", "title price")
        .populate("categoryId", "name")
        .lean();

      const uniqueTransactionIds = [
        ...new Set(
          mockTestAccessRecords
            .filter((r) => r.transactionId)
            .map((r) => r.transactionId)
        ),
      ];

      if (uniqueTransactionIds.length > 0) {
        const paymentRecords = await Payment.find({ transactionId: { $in: uniqueTransactionIds } })
          .populate("paymentForId", "name title")
          .lean();

        payments = paymentRecords.map((payment) => {
          const related = mockTestAccessRecords.filter((r) => r.transactionId === payment.transactionId);
          if (payment.paymentType === "category") {
            return {
              ...payment,
              categoryDetails: {
                testsPurchased: related.length,
                tests: related.map((r) => ({
                  testId: r.mockTestId?._id,
                  testTitle: r.mockTestId?.title,
                  isCompleted: r.isCompleted,
                })),
              },
            };
          } else if (payment.paymentType === "test") {
            const testAccess = mockTestAccessRecords.find(
              (r) => r.mockTestId?._id?.toString() === payment.paymentForId?._id?.toString()
            );
            return {
              ...payment,
              testAccessDetails: { isCompleted: testAccess?.isCompleted || false, purchaseDate: testAccess?.purchaseDate },
            };
          }
          return payment;
        });
      } else {
        payments = [];
      }
    }

    return res.status(200).json({ success: true, message: "Payment history retrieved", data: payments });
  } catch (err) {
    console.error("❌ Payment History Error:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    return res.status(500).json({ success: false, message: "Failed to retrieve payment history", error: err.message });
  }
};
