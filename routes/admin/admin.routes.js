import express from "express";
import {
  loginAdmin,
  forgotAdminPassword,
  resetAdminPasswordWithOtp,
  resetAdminPassword,
  createAdmin,
  refreshTokenAdmin,
  getAdminProfile,
} from "../../controllers/admin/Auth/admin.auth.controller.js";
import {
  createBanner,
  deleteBanner,
  getBanners,
  updateBanner,
} from "../../controllers/admin/Banner_Management/admin.banner.controller.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  softDeleteAnnouncement,
  updateAnnouncement,
} from "../../controllers/admin/Announcement/admin.announcement.controller.js";
import {
  createCourse,
  deleteCourse,
  getCourseById,
  getCourses,
  updateCourse,
} from "../../controllers/admin/Courses/courses.controller.js";
import {
  createChapter,
  deleteChapter,
  getAllChapters,
  getChapterById,
  updateChapter,
} from "../../controllers/admin/Courses/chapter.controller.js";
import { getAllUsers, getUserByEmail, getUserById, getUserByName } from "../../controllers/admin/Users/userController.js";

import {
  createSubject,
  getAllSubjects,
  updateSubject,
  deleteSubject,
  getSubjectById,
  getSubjectByCourseId
} from "../../controllers/Subject/subject.controller.js"
import {
  createModule,
  getAllModules,
  updateModule,
  deleteModule,
  getModuleById,
  getModuleByCourseId,
  getModuleBySubjectId
} from "../../controllers/Module/module.controller.js"

import {
  createTopic,
  getAllTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
  getTopicByCourseId
} from "../../controllers/Topic/topic.controller.js";
import { get } from "mongoose";
import { getAllDeviceChangeRequests, handleDeviceRequest } from "../../controllers/DeviceChangeRequest/deviceChange.controller.js"

import { createMockTest, createMockTestQuestion, GetAllMockTest, DeleteMocket, updateMockTestWithQuestions , GetMockTestById, getAllQuestions, getMockTestHistory, getTestResultById, getUserTestStatistics } from "../../controllers/MockTest/mockTest.controller.js";

import { createPayment, getAllPaymentHistory, userSummary,deleteUser } from "../../controllers/Payment/payment.controller.js"

import { getDashboardStats, lineChart } from "../../controllers/Dashbaord/dashboard.controller.js"

import UploadToS3 from '../../controllers/upload/UploadToS3.js';


import {
  createSubjectManagemnet,
  getAllSubjectManagement,
  updateSubjectManagement,
  deleteSubjectManagement
} from "../../controllers/subjectMangementSubject/subjectmanagementSubject.controller.js"

import {
  createModuleManagement,
  getAllModulesManagement,
  updateModuleManagement,
  deleteModuleManagement,
  getModuleBySubjectIdManagement
} from "../../controllers/subjectMangementModule/subjectmanagementModue.controller.js"

import upload from '../../middleware/multerConfig.js';
import{
  createTopicManagement,
  getAllTopicsManagement
} from "../../controllers/subjectMangementTopic/subjectmanagementTopic.controller.js"
import { getAllResults } from "../../controllers/MockTest/mockTestResultSubmission.controller.js";
import uploadtoGoogleCloudWithoutCourse from "../../controllers/uploadtoGoogleCloudWithoutCourse/uploadtoGoogleCloudWithoutCourse.js";

const router = express.Router();

// NOTE: 📝 This is login / AUTH Routes

router.post("/login", loginAdmin);
router.post("/forgot-password", forgotAdminPassword);
router.post("/reset-password-otp", resetAdminPasswordWithOtp);
router.post("/reset-password/:adminId", resetAdminPassword);
router.post("/create", createAdmin);
router.post("/refresh-token", refreshTokenAdmin);
router.get("/getAdminById/:id", getAdminProfile);

// NOTE: 📝 This is Banner Management Routes

router.post("/create/banner", createBanner); // create
router.get("/get/banners", getBanners); // get all
router.put("/get/:bannerId", updateBanner); // edit
router.delete("/delete/:bannerId", deleteBanner); // delete

// NOTE: 📝 This is for Announcement
router.post("/create/announcement", createAnnouncement);
router.get("/getall/announcement", getAllAnnouncements);
router.get("/get/announcement/:id", getAnnouncementById);
router.put("/update/announcement/:id", updateAnnouncement);
router.delete("/delete/announcement/:id", deleteAnnouncement);
router.put("/soft-delete/announcement/:id/inactive", softDeleteAnnouncement); // soft  delete
//** This is Course Routes */
// Create a new course
router.post("/create/courses", createCourse);
// Get all courses
router.get("/get/courses", getCourses);
// Get a specific course by ID
router.get("/get/courseById/:id", getCourseById);
// Update a course by ID
router.put("/update/courseById/:id", updateCourse);
// Delete a course by ID
router.delete("/delete/courseById/:id", deleteCourse);

// * This is Chapter Routes
router.post("/create/chapter", createChapter);
router.get("/get/all/chapters", getAllChapters);
router.get("/get/chapterById/:id", getChapterById);
// Update a chapter by ID
router.put("/update/chapterById/:id", updateChapter);
// Delete a chapter by ID
router.delete("/delete/chapterById/:id", deleteChapter);



// get all users //api
router.get("/get/all/users", getAllUsers)
router.get("/getuserbyid/:id", getUserById);
router.get('/getUserByEmail/:email', getUserByEmail)
router.get('/getUserByName/:Name', getUserByName)
// This is subjects routes

router.get("/get/all/subject", getAllSubjects);
// router.post('/create/subject', upload.single('photo'), createSubject);
router.post("/create/subject", createSubject);
router.put("/update/subject/:id", updateSubject);
router.delete("/delete/subject/:id", deleteSubject);
router.get("/get/subject/:id", getSubjectById);
router.get("/get/subjectByCourseId/:courseId", getSubjectByCourseId);
// This is module routes

router.post("/create/module", createModule);
router.get("/get/all/modules", getAllModules);
router.put("/update/module/:id", updateModule);
router.delete("/delete/module/:id", deleteModule);
router.get("/get/moduleById/:id", getModuleById);
router.get("/get/moduleByCourseId/:courseId", getModuleByCourseId);
router.get("/get/moduleBySubjectId/:subjectId", getModuleBySubjectId);

// This is topic routes

router.post('/create/topic', upload.fields([
  { name: 'note', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), createTopic);

router.put("/update/topic/:id", upload.fields([
  { name: "note", maxCount: 1 },
  { name: "video", maxCount: 1 },
]), updateTopic);

router.delete("/delete/topic/:id", deleteTopic);
router.get("/get/all/topics", getAllTopics);
router.get("/get/topic/:id", getTopicById);
router.get("/get/topicByCourseId/:courseId", getTopicByCourseId);

// This is Device Change Request routes


router.post("/get/all/deviceChangeRequests", getAllDeviceChangeRequests);
router.put("/handle/deviceRequest/:id", handleDeviceRequest);


router.post('/upload/files', upload.any(), UploadToS3);


// This is Mock test Routes

router.post("/createMockTest", createMockTest);
router.post("/createMockTestQuestion", createMockTestQuestion)
router.get("/get/all/mockTest", GetAllMockTest);
router.delete("/delete/mockTest/:id", DeleteMocket);
router.put("/mocktests/:testId", updateMockTestWithQuestions);
router.get("/get/mockTestById/:id", GetMockTestById);
router.post("/get/mockTestQuestionsById", getAllQuestions);


// This is Payment routes

router.post("/createPayment", createPayment);
router.post("/delete/userById", deleteUser)
router.get("/getAllPaymentHistory", getAllPaymentHistory)
router.get("/user-purchases-summary", userSummary)

// this is dashboard route

router.get("/get/all/dashboardCount", getDashboardStats)
router.get("/get/all/lineChart", lineChart);

// This is Subject Management routes

// subject Routes
router.post("/create/subjectManagement", createSubjectManagemnet);
router.get("/get/all/subjectManagement", getAllSubjectManagement);
router.put("/update/subjectManagement/:id", updateSubjectManagement);
router.delete("/delete/subjectManagement/:id", deleteSubjectManagement);

// module routes

router.post("/create/moduleManagement", createModuleManagement);
router.get("/get/all/moduleManagement", getAllModulesManagement);
router.put("/update/moduleManagement/:id", updateModuleManagement);
router.delete("/delete/moduleManagement/:id", deleteModuleManagement);
router.get("/get/moduleBySubjectIdManagement/:subjectId", getModuleBySubjectIdManagement);


// topic routes

router.post("/create/topicManagement", createTopicManagement);
router.get("/get/all/topicManagement", getAllTopicsManagement);
router.post('/uploadSubjectManagement/files', upload.any(), uploadtoGoogleCloudWithoutCourse);



// Get all mock test results 
router.get("/all", getAllResults);


router.get('/get/mocktest/history', getMockTestHistory);

// Get single test result by ID
router.get('/get/mocktest/history/by/id/:id', getTestResultById);

// Get user test statistics
router.get('/user/:userId/statistics', getUserTestStatistics);

export default router;
