import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../config/config.js";
import User from "../models/user.model.js";

const DEMO_EMAIL = "sayanpal2469@gmail.com";
const DEMO_PASSWORD = "123456789";

async function run() {
  await mongoose.connect(config.mongoURI);
  console.log(`Connected to ${config.mongoURI}`);

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $setOnInsert: { email: DEMO_EMAIL, deviceId: null },
      $set: {
        password: hashedPassword,
        isActive: true,
        profileUpdated: true,
        firstName: "Demo",
        lastName: "User",
      },
    },
    { upsert: true, new: true }
  );

  console.log("Demo user ready:", user.email, user._id.toString());
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed to create demo user:", err);
  process.exit(1);
});
