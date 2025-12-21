import MockTestResult from "../../models/testResult.model.js";
import MockTest from "../../models/mockTest.model.js";
import MockTestQuestion from "../../models/mockTestQuestion.model.js";
import mongoose from "mongoose";
import { getMockTestAccess } from "../user/purchased/verifyCoursePurchase.js";
import mockTestAccess from "../../models/mockTestAccess.js";

// Save test result
export const saveTestResult = async (req, res) => {
  try {
    const {
      userId,
      testId,
      totalTimeSpent,
      userAnswers,
      questionWiseTime
    } = req.body;

    console.log({ userId, testId, totalTimeSpent, userAnswers, questionWiseTime });

    // Validate required fields
    if (!userId || !testId || totalTimeSpent === undefined) {
      return res.status(400).json({
        success: false,
        message: "userId, testId, and totalTimeSpent are required"
      });
    }

    // Check if test exists
    const test = await MockTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Mock test not found"
      });
    }

    // Get questions for this test
    const questions = await MockTestQuestion.find({ testId: testId, isActive: true });
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for this test"
      });
    }

    // Calculate results
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unattempted = 0;

    const questionWiseResults = questions.map((question, index) => {
      const userAnswer = userAnswers?.[index] || {};
      const selectedOption = userAnswer.selectedOption;
      const isAnswered = selectedOption !== null && selectedOption !== undefined;
      const isCorrect = isAnswered && selectedOption === question.correctAnswerIndex;
      
      if (!isAnswered) unattempted++;
      else if (isCorrect) correctAnswers++;
      else wrongAnswers++;

      return {
        questionId: question._id,
        questionText: question.questionText,
        selectedOption: selectedOption,
        correctOption: question.correctAnswerIndex,
        timeSpent: questionWiseTime?.[index]?.timeSpent || 0,
        isCorrect: isCorrect,
        options: question.options.map(opt => ({
          optionNumber: opt.optionNumber,
          answer: opt.answer,
          isImage: opt.answer?.startsWith('http') || false
        }))
      };
    });

    const totalQuestions = questions.length;
    const score = (correctAnswers / totalQuestions) * 100;

    // Create new test result (allow multiple attempts)
    const testResult = new MockTestResult({
      userId,
      testId,
      testTitle: test.title,
      totalQuestions,
      totalTimeSpent,
      score: parseFloat(score.toFixed(2)),
      correctAnswers,
      wrongAnswers,
      unattempted,
      questionWiseResults
    });

    const savedResult = await testResult.save();

    // If test is paid, find and update the active purchase
    if (test.isPaid) {
      // Find the most recent active purchase (not completed yet)
      const activePurchase = await mockTestAccess.findOne({
        userId,
        mockTestId: testId,
        isCompleted: false
      }).sort({ createdAt: -1 });
      
      if (activePurchase) {
        // Mark this specific purchase as completed and link to result
        await mockTestAccess.findByIdAndUpdate(
          activePurchase._id,
          { 
            isCompleted: true,
            testResultId: savedResult._id
          },
          { new: true }
        );
        console.log(`Marked purchase ${activePurchase._id} as completed for test ${testId}`);
      } else {
        console.log(`No active purchase found for test ${testId}`);
        
        // If no active purchase found, create one (for edge cases)
        // This handles cases where purchase record might be missing
        const newPurchase = new mockTestAccess({
          userId,
          mockTestId: testId,
          isCompleted: true,
          testResultId: savedResult._id
        });
        await newPurchase.save();
        console.log(`Created new purchase record for test ${testId}`);
      }
    }

    res.status(201).json({
      success: true,
      message: "Test result saved successfully",
      data: savedResult
    });

  } catch (error) {
    console.error("Error saving test result:", error);
    
    res.status(500).json({
      success: false,
      message: "Server error while saving test result",
      error: error.message
    });
  }
};

// Get all results for a user
export const getResultsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const results = await MockTestResult.find({ userId, isActive: true })
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .select('-questionWiseResults') // Exclude detailed results for list view
      .populate('testId', 'title category subject mockTestType isPaid price');

    const totalCount = await MockTestResult.countDocuments({ userId, isActive: true });

    res.status(200).json({
      success: true,
      message: "Results retrieved successfully",
      data: {
        results,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalResults: totalCount,
          hasNext: pageNum < Math.ceil(totalCount / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error("Error fetching results by user ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching results",
      error: error.message
    });
  }
};

// Get specific result by userId and testId
export const getResultByUserAndTest = async (req, res) => {
  try {
    const { userId, testId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or test ID"
      });
    }

    const result = await MockTestResult.findOne({
      userId,
      testId,
      isActive: true
    }).populate('testId', 'title category subject mockTestType totalQuestions durationMinutes');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Test result not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Result retrieved successfully",
      data: result
    });

  } catch (error) {
    console.error("Error fetching result by user and test:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching result",
      error: error.message
    });
  }
};

// Get all results (admin function)
export const getAllResults = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'submittedAt', 
      sortOrder = 'desc',
      userId,
      testId,
      minScore,
      maxScore
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build filter query
    let filter = { isActive: true };
    if (userId) filter.userId = userId;
    if (testId) filter.testId = testId;
    if (minScore !== undefined || maxScore !== undefined) {
      filter.score = {};
      if (minScore !== undefined) filter.score.$gte = parseFloat(minScore);
      if (maxScore !== undefined) filter.score.$lte = parseFloat(maxScore);
    }

    const results = await MockTestResult.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email')
      .populate('testId', 'title category subject');

    const totalCount = await MockTestResult.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "All results retrieved successfully",
      data: {
        results,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalResults: totalCount,
          hasNext: pageNum < Math.ceil(totalCount / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error("Error fetching all results:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching results",
      error: error.message
    });
  }
};

// Get user's test statistics
export const getUserTestStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const stats = await MockTestResult.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$score" },
          totalCorrectAnswers: { $sum: "$correctAnswers" },
          totalWrongAnswers: { $sum: "$wrongAnswers" },
          totalUnattempted: { $sum: "$unattempted" },
          totalTimeSpent: { $sum: "$totalTimeSpent" },
          bestScore: { $max: "$score" },
          recentTests: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          _id: 0,
          totalTests: 1,
          averageScore: { $round: ["$averageScore", 2] },
          totalCorrectAnswers: 1,
          totalWrongAnswers: 1,
          totalUnattempted: 1,
          totalTimeSpent: 1,
          bestScore: { $round: ["$bestScore", 2] },
          accuracy: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$totalCorrectAnswers",
                      { $add: ["$totalCorrectAnswers", "$totalWrongAnswers"] }
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalTests: 0,
      averageScore: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      totalUnattempted: 0,
      totalTimeSpent: 0,
      bestScore: 0,
      accuracy: 0
    };

    res.status(200).json({
      success: true,
      message: "User statistics retrieved successfully",
      data: result
    });

  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching statistics",
      error: error.message
    });
  }
};



export const getAttemptedTests = async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    // Find all test results for the user and extract testIds
    const attemptedTests = await MockTestResult.find(
      { 
        userId: userId, 
        isActive: true 
      },
      { testId: 1, _id: 0 } // Only return testId field, exclude _id
    ).distinct('testId'); // Get unique testIds

    console.log(`📊 Found ${attemptedTests.length} attempted tests for user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Attempted tests retrieved successfully",
      data: {
        attemptedTestIds: attemptedTests,
        totalAttempted: attemptedTests.length
      }
    });

  } catch (error) {
    console.error("Error fetching attempted tests:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching attempted tests",
      error: error.message
    });
  }
};