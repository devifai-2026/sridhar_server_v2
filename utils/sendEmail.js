import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { config } from "../config/config.js";

const EMAIL_USER = "sridhareducationwb@gmail.com"
const EMAIL_PASS = "nnnovpvivgkzyqca"

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465, // or 587 for TLS
      secure: true, // true for 465, false for 587
      auth: {
        user: EMAIL_USER, // your Gmail
        pass: EMAIL_PASS, // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: `"Sridhar LMS" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw new Error("Email failed to send");
  }
};
