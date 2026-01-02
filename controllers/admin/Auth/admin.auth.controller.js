import Admin from "../../../models/admin.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../utils/sendEmail.js"; // use nodemailer
import { config } from "../../../config/config.js";
import { generateTokens } from "../../../utils/generateToken.js";

// Admin Login
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: "Admin not found" });
  if (admin.status !== "active")
    return res.status(403).json({ message: "Admin not active" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  const { token, refreshToken } = generateTokens(admin._id);
  admin.refreshToken = refreshToken;
  admin.lastLogin = new Date();
  await admin.save();

  res.json({
    message: "Login successful",
    token,
    refreshToken,
    admin: {
      id: admin._id,
      email: admin.email,
      name: `${admin.firstName} ${admin.lastName}`,
    },
  });
};

// Forgot Password (send OTP)
export const forgotAdminPassword = async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  admin.resetOtp = otp;
  admin.resetOtpExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await admin.save();

  await sendEmail({
    to: email,
    subject: "Admin Password Reset OTP",
    html: `Your OTP is: ${otp}`,
  });
  res.json({ message: "OTP sent to email ." });
};

// Reset Password (with OTP)
export const resetAdminPasswordWithOtp = async (req, res) => {
  
  const { email, otp, newPassword } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  if (admin.resetOtp !== otp || admin.resetOtpExpires < Date.now()) {
    return res.status(400).json({ message: "OTP is invalid or expired" });
  }

  admin.password = await bcrypt.hash(newPassword, 10);
  admin.resetOtp = null;
  admin.resetOtpExpires = null;
  await admin.save();


  res.json({ message: "Password reset successful" });
};

// Reset Password (with current password)
export const resetAdminPassword = async (req, res) => {
  const { adminId } = req.params;
  const { currentPassword, newPassword } = req.body;

  const admin = await Admin.findById(adminId);
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  const isMatch = await bcrypt.compare(currentPassword, admin.password);
  if (!isMatch)
    return res.status(401).json({ message: "Current password is incorrect" });

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();

  res.json({ message: "Password changed successfully" });
};

// Create New Admin
export const createAdmin = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  const exists = await Admin.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email already used" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newAdmin = new Admin({
    firstName,
    lastName,
    email,
    password: hashedPassword,
  });

  await newAdmin.save();
  res.status(201).json({ message: "Admin created successfully" });
};

// Refresh Access Token
export const refreshTokenAdmin = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token required" });

  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    const admin = await Admin.findById(decoded.id);

    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const { token, refreshToken: newRefresh } = generateTokens(admin._id);
    admin.refreshToken = newRefresh;
    await admin.save();

    res.json({
      token,
      refreshToken: newRefresh,
    });
  } catch (err) {
    res.status(401).json({ message: "Refresh token expired or invalid" });
  }
};

export const getAdminProfile = async (req, res) => {
  const adminId = req.params.id;
  const admin = await Admin.findById(adminId); 
  if (!admin) return res.status(404).json({ message: "Admin not found" });

  res.json({
    id: admin._id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    status: admin.status,
    lastLogin: admin.lastLogin,
    password: admin.password // ⚠ this will be hashed, not plain text
  });
};
