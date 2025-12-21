import DeviceChangeRequest from "../../../models/deviceChangeRequest.model.js";
import User from "../../../models/user.model.js";




export const raiseDeviceChangeRequest = async (req, res) => {
  try {
    const { email, newDeviceId, reason } = req.body;

    console.log("📥 Device Change Request:", req.body);

    // 1️⃣ Validate input
    if (!email || !newDeviceId || !reason) {
      return res.status(400).json({
        message: "Email, new device ID, and reason are required",
      });
    }

    // 2️⃣ Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        message: "No user found with this email",
      });
    }

    // 3️⃣ Check if user already has a pending request
    const existingRequest = await DeviceChangeRequest.findOne({
      userId: user._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "A device change request is already pending",
        requestId: existingRequest._id,
      });
    }

    // 4️⃣ Ensure previous device exists
    if (!user.deviceId) {
      return res.status(400).json({
        message: "No previous device registered for this account",
      });
    }

    // 5️⃣ Create new request
    const newRequest = new DeviceChangeRequest({
      userId: user._id,
      PreviousDeviceId: user.deviceId,
      newDeviceId,
      reason,
    });

    await newRequest.save();

    console.log("✅ Device Change Request Created:", newRequest._id);

    return res.status(201).json({
      message: "Device change request submitted successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("❌ Device Change Request Error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
