import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

export const generateTokens = (id) => {
  const token = jwt.sign({ id }, config.jwtSecret, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ id }, config.jwtSecret, { expiresIn: "7d" });
  return { token, refreshToken };
};
