import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import User from "../models/user.model.js";

// If the request carries a valid token for a user who has since been
// deactivated OR deleted by an admin, block it so the app can force a
// logout. Requests with no/invalid token are passed through untouched —
// this middleware only enforces the deactivated/deleted-account case,
// not general auth.
export const checkActiveUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return next();
    }

    const user = await User.findById(decoded.id).select("isActive");
    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        code: "USER_DEACTIVATED",
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    next();
  } catch (error) {
    next();
  }
};
