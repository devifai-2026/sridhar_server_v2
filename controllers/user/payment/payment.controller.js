import crypto from "crypto";
import Payment from "../../../models/payment.model.js";
import Course from "../../../models/course.model.js";
import CourseAccess from "../../../models/courseAccess.model.js";
import MockTest from "../../../models/mockTest.model.js";
import mockTestAccess from "../../../models/mockTestAccess.js";
import mongoose from 'mongoose'; // or const mongoose = require('mongoose');
import MocktestCategory from "../../../models/mocktestCategory.model.js";
const PHONEPE_MERCHANT_ID = "PGTESTPAYUAT86";
const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = 1;

// =============================
// CREATE PAYMENT ORDER
// =============================

export const createPaymentOrder = async (req, res) => {
  try {
    const { userId, paymentType, paymentForId } = req.body;

    // Validate input
    if (!userId || !paymentType || !paymentForId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, paymentType, paymentForId)",
      });
    }

    let amount = 0;
    let itemName = "";

    // ----------------------------
    // 📘 COURSE PAYMENT
    // ----------------------------
    if (paymentType === "course") {
      const course = await Course.findById(paymentForId);

      if (!course)
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });

      amount = course.discountedPrice * 100; // convert to paise
      itemName = course.title;
    }

    // ----------------------------
    // 🧪 TEST PAYMENT
    // ----------------------------
    else if (paymentType === "test") {
      const mockTest = await MockTest.findById(paymentForId);

      if (!mockTest)
        return res
          .status(404)
          .json({ success: false, message: "Mock Test not found" });

      amount = mockTest.price * 100;
      itemName = mockTest.title;
    }

    // ----------------------------
    // 📚 CATEGORY PAYMENT
    // ----------------------------
    else if (paymentType === "category") {
      const category = await MocktestCategory.findById(paymentForId);

      if (!category)
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });

      amount = category.price * 100;
      itemName = category.name;
      
      // Check if user already purchased this category
      const existingPurchase = await UserPayment.findOne({
        userId,
        paymentType: "category",
        paymentForId,
        status: "completed"
      });

      if (existingPurchase) {
        return res.status(400).json({
          success: false,
          message: "You have already purchased this category",
        });
      }
    }

    // ----------------------------
    // ❌ INVALID TYPE
    // ----------------------------
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid paymentType. Must be 'course', 'test', or 'category'.",
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount. Item might be free.",
      });
    }

    // ----------------------------
    // 🏦 PHONEPE PAYLOAD
    // ----------------------------
    const merchantTransactionId = "TXN-" + Date.now();

    const payBody = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: userId,
      amount,
      redirectUrl: `https://sridhareducation.cloud/api/users/paymentgateway/payment/redirect?txnId=${merchantTransactionId}&paymentType=${paymentType}`,
      redirectMode: "REDIRECT",
      callbackUrl: "https://sridhareducation.cloud/api/users/paymentgateway/payment/callback",
      paymentInstrument: { type: "PAY_PAGE" },
      merchantOrderId: `${paymentType}_${paymentForId}_${Date.now()}`,
      message: `Payment for ${paymentType}: ${itemName}`,
    };

    const base64Body = Buffer.from(JSON.stringify(payBody)).toString("base64");

    const sha256 = crypto
      .createHash("sha256")
      .update(base64Body + "/pg/v1/pay" + SALT_KEY)
      .digest("hex");

    const xVerify = sha256 + "###" + SALT_INDEX;

    // ----------------------------
    // 📡 SEND REQUEST TO PHONEPE
    // ----------------------------
    const phonepeRes = await fetch(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
        },
        body: JSON.stringify({ request: base64Body }),
      }
    );

    const data = await phonepeRes.json();

    // Error from PhonePe
    if (!data.success)
      return res.status(400).json({
        success: false,
        message: data.message || "Payment gateway error",
      });

    const payUrl = data.data.instrumentResponse.redirectInfo.url;

    // ----------------------------
    // 💾 SAVE PAYMENT LOG
    // ----------------------------
    await Payment.create({
      userId,
      paymentType, // "course", "test", or "category"
      paymentForId,
      itemName,
      amount: amount / 100, // convert back to rupees
      transactionId: merchantTransactionId,
      status: "pending",
      metadata: {
        itemType: paymentType,
        itemId: paymentForId,
        itemName: itemName,
      },
    });

    return res.json({
      success: true,
      payUrl,
      transactionId: merchantTransactionId,
      itemName,
      amount: amount / 100,
    });
  } catch (err) {
    console.error("❌ Payment Error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: err.message 
    });
  }
};


// =============================
// CALLBACK HANDLER
// =============================
export const paymentCallback = async (req, res) => {
  try {
    const decoded = JSON.parse(
      Buffer.from(req.body.response, "base64").toString("utf8")
    );

    const merchantTransactionId = decoded.data.merchantTransactionId;
    const code = decoded.code;

    const payment = await Payment.findOne({
      transactionId: merchantTransactionId,
    });

    if (!payment)
      return res.json({ success: false, message: "Invalid transaction" });

    if (code === "PAYMENT_SUCCESS") {
      payment.status = "success";
    } else {
      payment.status = "failed";
    }

    await payment.save();

    if (payment.status === "success" && payment.paymentType === "course") {
      const course = await Course.findById(payment.paymentForId);

      const months = course.duration;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      await CourseAccess.create({
        userId: payment.userId,
        courseId: payment.paymentForId,
        startDate,
        endDate,
      });
    } else if (payment.status === "success" && payment.paymentType === "test") {
      const mockTest = await MockTest.findById(payment.paymentForId);

      if (!mockTest) {
        console.error("Mock Test not found");
      }

      await mockTestAccess.create({
        userId: payment.userId,
        mockTestId: payment.paymentForId,
        isCompleted: false,
        transactionId: merchantTransactionId
      });
    }

    res.status(200).send("OK");
  } catch (err) {
    res.status(500).send("ERROR");
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const { userId, paymentForId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Convert string IDs to ObjectId
    const query = { 
      userId: new mongoose.Types.ObjectId(userId) 
    };
    
    // Only add paymentForId to query if it's provided
    if (paymentForId) {
      query.paymentForId = new mongoose.Types.ObjectId(paymentForId);
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate("paymentForId", "name title")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Payment history retrieved",
      data: payments,
    });
  } catch (err) {
    console.error("❌ Get Payment History Error:", err);
    
    // Handle specific error cases
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payment history",
    });
  }
};
