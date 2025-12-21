import User from "../../../models/user.model.js";

export const createOrUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.params; // passed as /users/profile/:userId
    const { firstName, lastName, phone } = req.body;

    // Validate input
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        phone,
        profileUpdated: true,
      },
      { new: true }
    ).select("-password -refreshToken -resetToken -resetTokenExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user by ID
    const user = await User.findById(userId)
      .select("-password -refreshToken -resetToken -resetTokenExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phone: user.phone || '',
        profileUpdated: user.profileUpdated || false,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};