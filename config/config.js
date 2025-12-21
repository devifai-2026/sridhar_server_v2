import dotenv from "dotenv";
import fs from "fs";

// Load correct .env file
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  console.warn(
    `⚠️  ${envFile} not found. Using default environment variables.`
  );
}

export const config = {
  port: process.env.PORT || 8080,
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  env: process.env.NODE_ENV || "development",
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
};
