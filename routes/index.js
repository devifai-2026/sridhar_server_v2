import express from "express";

const router = express.Router();

// Root Route (HTML landing page is served statically via public/)
router.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

export default router;
