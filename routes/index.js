import express from "express";
import logger from "../middleware/logger.js";

const router = express.Router();

// Middleware
router.use(logger);

// Root Route (HTML landing page is served statically via public/)
router.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

export default router;
