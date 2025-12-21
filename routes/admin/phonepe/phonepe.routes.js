import express from "express";
import {
  createCredentials,
  getAllCredentials,
  getCredentialsById,
  updateCredentials,
  deleteCredentials,
  setActiveCredential,
} from "../../../controllers/admin/PhonepeController/phonepe.controller.js";

const router = express.Router();

// STATIC ROUTES FIRST
router.post("/", createCredentials);
router.get("/", getAllCredentials);

// SPECIAL ROUTES (must come before :id)
router.put("/:id/activate", setActiveCredential);

// DYNAMIC ROUTES LAST
router.get("/:id", getCredentialsById);
router.put("/:id", updateCredentials);
router.delete("/:id", deleteCredentials);

export default router;
