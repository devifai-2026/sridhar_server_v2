import PhonePeCredentials from "../../../models/PhonePeCredentials.js";

// ➤ Create / Add credentials
export const createCredentials = async (req, res) => {
  try {
    const { type, clientId, clientSecret, clientVersion } = req.body;

    const saved = await PhonePeCredentials.create({
      type,
      clientId,
      clientSecret,
      clientVersion,
    });

    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ➤ Get all credentials
export const getAllCredentials = async (req, res) => {
  try {
    const list = await PhonePeCredentials.find();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ➤ Get one credential
export const getCredentialsById = async (req, res) => {
  try {
    const item = await PhonePeCredentials.findById(req.params.id);
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ➤ Update credentials
export const updateCredentials = async (req, res) => {
  try {
    const updated = await PhonePeCredentials.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ➤ Delete credentials
export const deleteCredentials = async (req, res) => {
  try {
    await PhonePeCredentials.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const setActiveCredential = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Check if credential exists
    const exists = await PhonePeCredentials.findById(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    // 2️⃣ Set all credentials to inactive
    await PhonePeCredentials.updateMany({}, { isActive: false });

    // 3️⃣ Set selected credential to active
    const updated = await PhonePeCredentials.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );

    res.json({
      success: true,
      message: "Active credential updated",
      data: updated,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
