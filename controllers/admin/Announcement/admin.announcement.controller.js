import Announcement from "../../../models/announcement.model.js";


// 1. Create Announcement
export const createAnnouncement = async (req, res) => {
  try {
    const { tag, header, description, imageURL, createdBy, status,hyperlinkEnabled } = req.body;

    const announcement = new Announcement({
      tag,
      header,
      description,
      imageURL,
      createdBy,
      status,
      hyperlinkEnabled
    });

    await announcement.save();
    res.status(201).json({ message: "Announcement created", announcement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get all announcements (active only, basic fields)
export const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ status: "active" })
      .select("tag header description _id imageURL status")
      .sort({ createdAt: -1 });

    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Get announcement by ID (only if active)
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findOne({
      _id: id,
      status: "active",
    });

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found or inactive" });
    }

    res.status(200).json(announcement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Update announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { tag, header, description, imageURL, status } = req.body;

    const updated = await Announcement.findByIdAndUpdate(
      id,
      { tag, header, description, imageURL, status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({ message: "Announcement updated", updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Delete announcement permanently
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Announcement.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({ message: "Announcement deleted permanently" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Soft delete announcement (set status to inactive)
export const softDeleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Announcement.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({ message: "Announcement soft-deleted", updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
