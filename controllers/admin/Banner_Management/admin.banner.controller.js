import Banner from "../../../models/banner.model.js";

// Create banner (max 4 allowed)
export const createBanner = async (req, res) => {
  try {
    const { imageUrl, order, createdBy } = req.body;

    const count = await Banner.countDocuments();
    if (count >= 4) {
      return res.status(400).json({ message: "Maximum 4 banners allowed" });
    }

    // Check if order number already exists
    const existingOrder = await Banner.findOne({ order });
    if (existingOrder) {
      return res.status(400).json({ message: "Order number already in use" });
    }

    const banner = new Banner({ imageUrl, order, createdBy });
    await banner.save();

    res.status(201).json({ message: "Banner created successfully", banner });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.order) {
      return res.status(400).json({ message: "Order number must be unique" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get all banners (sorted by `order`)
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1 });
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Edit banner by ID
export const updateBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { imageUrl, order } = req.body;

    const updated = await Banner.findByIdAndUpdate(
      bannerId,
      { imageUrl, order },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({ message: "Banner updated", banner: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete banner by ID
export const deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    const deleted = await Banner.findByIdAndDelete(bannerId);
    if (!deleted) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({ message: "Banner deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
