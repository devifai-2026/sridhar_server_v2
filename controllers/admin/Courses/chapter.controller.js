import Chapter from "../../../models/chapter.model.js";

// *Create a new chapter
export const createChapter = async (req, res) => {
  try {
    const chapter = new Chapter(req.body);
    const savedChapter = await chapter.save();
    res.status(201).json(savedChapter);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//* Update a chapter by ID
export const updateChapter = async (req, res) => {
  try {
    const updatedChapter = await Chapter.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedChapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }
    res.status(200).json(updatedChapter);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//* Delete a chapter by ID
export const deleteChapter = async (req, res) => {
  try {
    const deletedChapter = await Chapter.findByIdAndDelete(req.params.id);
    if (!deletedChapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }
    res.status(200).json({ message: "Chapter deleted successfully" }); // Use 200 to return a message
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// * Get all chapters
export const getAllChapters = async (req, res) => {
  try {
    const chapters = await Chapter.find({});
    res.status(200).json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// *Get chapter by id
export const getChapterById = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }
    res.status(200).json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
