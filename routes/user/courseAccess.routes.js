// routes/courseAccessRoutes.js
import express from "express";
import {
  createCourseAccess,
  getCourseAccessByUser,
  getCourseAccessByCourseId,
  updateCourseAccess,
  deleteCourseAccess
} from "../../controllers/user/courseAccess/courseAccessController.js";

const router = express.Router();

router.post("/", createCourseAccess);
router.get("/user/:userId", getCourseAccessByUser);
router.get("/user/:userId/course/:courseId", getCourseAccessByCourseId);
router.put("/:id", updateCourseAccess);
router.delete("/:id", deleteCourseAccess);

export default router;
