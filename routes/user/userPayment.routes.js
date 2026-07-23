import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
} from "../../controllers/user/payment/payment.controller.js";
import { checkActiveUser } from "../../middleware/checkActiveUser.js";

const router = express.Router();

router.use(checkActiveUser);

router.post("/order", createPaymentOrder);
router.post("/verify", verifyPayment);
router.get("/history/:userId/:paymentForId?", getPaymentHistory);

export default router;
