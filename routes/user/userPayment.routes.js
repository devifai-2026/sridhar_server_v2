import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
} from "../../controllers/user/payment/payment.controller.js";

const router = express.Router();

router.post("/order", createPaymentOrder);
router.post("/verify", verifyPayment);
router.get("/history/:userId/:paymentForId?", getPaymentHistory);

export default router;
