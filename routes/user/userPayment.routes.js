import express from "express";
import axios from "axios";
import {
  createPaymentOrder,
  getPaymentHistory,
  paymentCallback,
} from "../../controllers/user/payment/payment.controller.js";

import { generateStatusXVerify } from "../../helpers/phonepe.helper.js";

const router = express.Router();

// =============================
//  CREATE PAYMENT ORDER
// =============================
router.post("/order", createPaymentOrder);

// =============================
//  REDIRECT AFTER PAYMENT
// =============================
router.get("/payment/redirect", async (req, res) => {
  try {
    const txnId = req.query.txnId;

    if (!txnId) {
      return res.sendFile("failed.html", { root: "public" });
    }

    const merchantId = "PGTESTPAYUAT86";

    const url = `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${txnId}`;

    const xVerify = generateStatusXVerify(merchantId, txnId);

    const result = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": merchantId,
      },
    });

    const response = result.data;

    if (response.success && response.data.state === "COMPLETED") {
      return res.sendFile("success.html", { root: "public" });
    } else {
      return res.sendFile("failed.html", { root: "public" });
    }

  } catch (error) {
    return res.sendFile("failed.html", { root: "public" });
  }
});

// =============================
//  CALLBACK
// =============================
router.post("/payment/callback", paymentCallback);


export default router;
