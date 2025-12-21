import MockTest from "../../models/mockTest.model.js";
import MockeTestQuestion from "../../models/mockTestQuestion.model.js"
import mongoose from "mongoose";
import MockTestResult from "../../models/testResult.model.js";


export const createMockTest = async (req, res) => {
    try {
        const { title, description, category, subject, mockTestType, isPaid, price, requiresCode, validCodes, totalQuestions, durationMinutes, questionIds, createdBy, isActive } = req.body;
        const newMockTest = new MockTest({
            title,
            description,
            category,
            subject,
            mockTestType,
            isPaid,
            price,
            requiresCode,
            validCodes,
            totalQuestions,
            durationMinutes,
            questionIds,
            createdBy,
            isActive
        });

        const savedMockTest = await newMockTest.save();
        return res.status(201).json({
            message: "Mock Test created successfully",
            savedMockTest
        });
    } catch (error) {
        console.error('Error creating mocktest:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const createMockTestQuestion = async (req, res) => {
    try {
        const { testId, questions } = req.body;

        // Validate testId and questions array
        if (!testId) {
            return res.status(400).json({ error: "testId is required" });
        }
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: "Questions should be a non-empty array" });
        }

        // Step 1 - Align question field names exactly as sent by frontend
        const questionDocs = questions.map((q) => {
            // Step 2 - Map options from the frontend options, use opt.answer directly, fallback to image
            const optionsFormatted = q.options.map((opt, index) => ({
                optionNumber: index + 1,
                answer: opt.answer || (opt.image ? opt.image : ""), // Use answer if exists, else image URL
            }));

            return {
                testId,
                questionText: q.questionText || "",          // Use questionText key (not q.text)
                isImageExists: !!q.questionImage,
                questionImage: q.questionImage || "",
                timeQuestion: q.timeQuestion || "",
                options: optionsFormatted,
                correctAnswerIndex:  // Use provided index or parse from correctAns string
                    typeof q.correctAnswerIndex === "number"
                        ? q.correctAnswerIndex
                        : parseInt(q.correctAns, 10) - 1,
                isActive: q.isActive !== undefined ? q.isActive : true,
                solutionImage: q.solutionImage || null,
            };
        });

        // Step 3 - Insert mapped questions
        const savedQuestions = await MockeTestQuestion.insertMany(questionDocs);
        const questionIds = savedQuestions.map(q => q._id);

        // Step 4 - Update MockTest with questionIds array
        const updatedMockTest = await MockTest.findOneAndUpdate(
            { _id: testId },
            { questionIds: questionIds },
            { new: true }
        );

        // Step 5 - Send success response
        res.status(201).json({ message: "Questions created successfully", data: savedQuestions });
    } catch (error) {
        console.error("Error creating mock test questions:", error);
        res.status(500).json({ error: "Server error while creating mock test questions" });
    }
};



export const GetAllMockTest = async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : null;
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        const search = req.query.search || "";
        const filter = req.query.filter || "";
        const from = req.query.from;
        const to = req.query.to;
        const isPaid = req.query.isPaid;

        // Build the query object for MockTest filtering

        let query = {};

        if (isPaid !== undefined) {
            query.isPaid = isPaid === "true";
        }

        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { subject: searchRegex },
                { description: searchRegex },
                { category: searchRegex },
                { title: searchRegex },
            ];

            if (!isNaN(Number(search))) {
                query.$or.push({ numberOfModules: Number(search) });
            }
        }

        if (filter === "today") {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "week") {
            const now = new Date();
            const first = now.getDate() - now.getDay();
            const start = new Date(now.setDate(first));
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "month") {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "year") {
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "custom" && from && to) {
            query.createdAt = { $gte: new Date(from), $lte: new Date(to) };
        }

        // Build aggregation pipeline
        const pipeline = [{ $match: query }];

        // $lookup to join MockTestQuestion
        pipeline.push({
            $lookup: {
                from: "mocktestquestions", // MongoDB collection name for MockTestQuestion
                localField: "_id",
                foreignField: "testId",
                as: "questions",
            },
        });

        // Optional: project fields including joined questions
        pipeline.push({
            $project: {
                title: 1,
                description: 1,
                category: 1,
                subject: 1,
                mockTestType: 1,
                isPaid: 1,
                price: 1,
                requiresCode: 1,
                validCodes: 1,
                totalQuestions: 1,
                durationMinutes: 1,
                createdBy: 1,
                isActive: 1,
                createdAt: 1,
                updatedAt: 1,
                questions: 1,
            },
        });

        // Pagination if applicable
        if (page && limit) {
            const skip = (page - 1) * limit;
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });
        }

        // Execute aggregation
        const mockTests = await MockTest.aggregate(pipeline);

        // Get total count for the query (without pagination)
        const totalCount = await MockTest.countDocuments(query);

        res.json({ success: true, mockTests, totalCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const DeleteMocket = async (req, res) => {
    try {
        const { id } = req.params;         // id from URL param
        const { type } = req.body;         // 'soft' or 'hard' from request body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid MockTest ID" });
        }

        // Validate type
        if (type !== "soft" && type !== "hard") {
            return res.status(400).json({ message: "Invalid delete type" });
        }

        if (type === "hard") {
            // Hard delete MockTest
            const mockTestDeleteResult = await MockTest.deleteOne({ _id: id });
            if (mockTestDeleteResult.deletedCount === 0) {
                return res.status(404).json({ message: "MockTest not found" });
            }
            // Hard delete related MockTestQuestions
            await MockeTestQuestion.deleteMany({ testId: id });

            return res
                .status(200)
                .json({ message: "Hard delete successful, mock test and related questions removed" });
        } else {
            // Soft delete: set isActive = false for MockTest and questions
            const mockTest = await MockTest.findOneAndUpdate(
                { _id: id, isActive: true },
                { isActive: false },
                { new: true }
            );
            if (!mockTest) {
                return res.status(404).json({ message: "MockTest not found or already inactive" });
            }
            await MockeTestQuestion.updateMany({ testId: id, isActive: true }, { isActive: false });

            return res.status(200).json({
                message: "Soft delete successful, mock test and related questions deactivated",
                mockTest,
            });
        }
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


export const updateMockTestWithQuestions = async (req, res) => {
    try {
        const { testId, mockTestData, questions } = req.body;

        if (!testId) {
            return res.status(400).json({ error: "testId is required" });
        }
        if (!mockTestData) {
            return res.status(400).json({ error: "mockTestData is required" });
        }

        let questionIds = [];

        if (Array.isArray(questions) && questions.length > 0) {
            for (const q of questions) {
                // Format options using the answer field directly
                const optionsFormatted = (q.options || []).map((opt, index) => ({
                    optionNumber: index + 1,
                    answer: opt.answer || "",
                }));

                const questionData = {
                    testId,
                    questionText: q.questionText || q.text || "",
                    isImageExists: !!q.questionImage && q.questionImage !== "",
                    questionImage: q.questionImage || null,
                    timeQuestion: q.timeQuestion || q.time || "",
                    options: optionsFormatted,
                    correctAnswerIndex:
                        typeof q.correctAnswerIndex === "number"
                            ? q.correctAnswerIndex
                            : (q.correctAns ? parseInt(q.correctAns, 10) - 1 : 0),
                    isActive: q.isActive !== undefined ? q.isActive : true,
                    solutionImage: q.solutionImage || null,
                };

                if (q._id) {
                    // Update existing question by fetching and saving to ensure nested arrays update properly
                    const existingQuestion = await MockeTestQuestion.findById(q._id);
                    if (existingQuestion) {
                        existingQuestion.testId = questionData.testId;
                        existingQuestion.questionText = questionData.questionText;
                        existingQuestion.isImageExists = questionData.isImageExists;
                        existingQuestion.questionImage = questionData.questionImage;
                        existingQuestion.timeQuestion = questionData.timeQuestion;
                        existingQuestion.options = questionData.options;
                        existingQuestion.correctAnswerIndex = questionData.correctAnswerIndex;
                        existingQuestion.isActive = questionData.isActive;
                        existingQuestion.solutionImage = questionData.solutionImage;
                        const savedQuestion = await existingQuestion.save();
                        questionIds.push(savedQuestion._id);
                    } else {
                        // If existing question not found, create new
                        const newQuestion = new MockeTestQuestion(questionData);
                        const savedQuestion = await newQuestion.save();
                        questionIds.push(savedQuestion._id);
                    }
                } else {
                    // Create new question if no _id
                    const newQuestion = new MockeTestQuestion(questionData);
                    const savedQuestion = await newQuestion.save();
                    questionIds.push(savedQuestion._id);
                }
            }
        }

        // Build update data for MockTest model
        const updateData = {
            title: mockTestData.title,
            description: mockTestData.description,
            category: mockTestData.category,
            subject: mockTestData.subject,
            mockTestType: mockTestData.mockTestType || mockTestData.testType,
            isPaid: mockTestData.isPaid !== undefined ? mockTestData.isPaid : mockTestData.testType === "paid",
            price: mockTestData.price || mockTestData.mockTestPrice || 0,
            validCodes: mockTestData.validCodes || [],
            requiresCode:
                mockTestData.requiresCode !== undefined
                    ? mockTestData.requiresCode
                    : (mockTestData.validCodes?.length > 0),
            totalQuestions: mockTestData.totalQuestions || mockTestData.totalQuestion || 0,
            durationMinutes: mockTestData.durationMinutes || mockTestData.totalMinutes || 0,
            createdBy: mockTestData.createdBy || mockTestData.userId || null,
            isActive: mockTestData.isActive !== undefined ? mockTestData.isActive : true,
        };

        if (questionIds.length > 0) {
            updateData.questionIds = questionIds;
        }

        const updatedMockTest = await MockTest.findByIdAndUpdate(testId, updateData, {
            new: true,
            runValidators: true,
        });

        if (!updatedMockTest) {
            return res.status(404).json({ error: "MockTest not found" });
        }

        res.status(200).json({ message: "MockTest updated successfully", data: updatedMockTest });
    } catch (error) {
        console.error("Error updating mock test with questions:", error);
        res.status(500).json({ error: "Server error while updating mock test" });
    }
};

export const GetMockTestById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid MockTest ID" });
        }
        const mockTest = await MockTest.findById(id).lean();
        if (!mockTest) {
            return res.status(404).json({ message: "MockTest not found" });
        }
        const questions = await MockeTestQuestion.find({
            testId: id
        }).lean();

        res.status(200).json({ success: true, mockTest: { ...mockTest, questions } });
    }
    catch (error) { 
        console.error("Error fetching mock test by ID:", error);
        res.status(500).json({ error: "Server error while fetching mock test" });
    }
};

export const getAllQuestions = async (req, res) => {
    try {
        const { testId } = req.body;

        // Validate testId
        if (!testId) {
            return res.status(400).json({ 
                success: false, 
                message: "testId is required in request body" 
            });
        }

        if (!mongoose.Types.ObjectId.isValid(testId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid testId format" 
            });
        }

        // Check if the mock test exists
        const mockTest = await MockTest.findById(testId);
        if (!mockTest) {
            return res.status(404).json({ 
                success: false, 
                message: "MockTest not found" 
            });
        }

        // Get all active questions for the testId
        const questions = await MockeTestQuestion.find({
            testId: testId,
            isActive: true
        }).lean();

        // Format the response
        const formattedQuestions = questions.map(question => ({
            _id: question._id,
            testId: question.testId,
            questionText: question.questionText,
            isImageExists: question.isImageExists,
            questionImage: question.questionImage,
            timeQuestion: question.timeQuestion,
            options: question.options.map(option => ({
                optionNumber: option.optionNumber,
                answer: option.answer,
                _id: option._id
            })),
            correctAnswerIndex: question.correctAnswerIndex,
            isActive: question.isActive,
            createdAt: question.createdAt,
            updatedAt: question.updatedAt,
            solutionImage: question.solutionImage
        }));

        res.status(200).json({
            success: true,
            message: "Questions retrieved successfully",
            data: {
                testId: testId,
                testTitle: mockTest.title,
                totalQuestions: questions.length,
                questions: formattedQuestions
            }
        });

    } catch (error) {
        console.error("Error fetching questions for mock test:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error while fetching questions",
            error: error.message 
        });
    }
};





export const getMockTestHistory = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const search = req.query.search || '';
    const userId = req.query.userId;
    const testId = req.query.testId;
    const from = req.query.from;
    const to = req.query.to;
    const sortBy = req.query.sortBy || 'submittedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter object
    const filter = {};

    // Filter by user ID if provided
    if (userId) {
      filter.userId = userId;
    }

    // Filter by test ID if provided
    if (testId) {
      filter.testId = testId;
    }

    // Filter by date range
    if (from || to) {
      filter.submittedAt = {};
      if (from) filter.submittedAt.$gte = new Date(from);
      if (to) filter.submittedAt.$lte = new Date(to);
    }

    // Construct aggregation pipeline
    const pipeline = [
      // Match stage for basic filters
      ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),

      // Lookup user details
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },

      // Lookup test details
      {
        $lookup: {
          from: 'mocktests',
          localField: 'testId',
          foreignField: '_id',
          as: 'testDetails'
        }
      },
      { $unwind: { path: '$testDetails', preserveNullAndEmptyArrays: true } },

      // Create safe user fields with fallbacks
      {
        $addFields: {
          safeUserDetails: {
            email: { $ifNull: ['$userDetails.email', ''] },
            phone: { $ifNull: ['$userDetails.phone', ''] },
            firstName: { $ifNull: ['$userDetails.firstName', ''] },
            lastName: { $ifNull: ['$userDetails.lastName', ''] },
            fullName: {
              $concat: [
                { $ifNull: ['$userDetails.firstName', ''] },
                ' ',
                { $ifNull: ['$userDetails.lastName', ''] }
              ]
            }
          },
          // Safe test details
          safeTestDetails: {
            title: { $ifNull: ['$testDetails.title', ''] },
            description: { $ifNull: ['$testDetails.description', ''] },
            totalMarks: { $ifNull: ['$testDetails.totalMarks', 0] },
            duration: { $ifNull: ['$testDetails.duration', 0] },
            passingMarks: { $ifNull: ['$testDetails.passingMarks', 0] },
            totalQuestions: { $ifNull: ['$testDetails.totalQuestions', 0] }
          }
        }
      },

      // Add performance category based on score
      {
        $addFields: {
          performanceCategory: {
            $switch: {
              branches: [
                { case: { $gte: ['$score', 90] }, then: 'Excellent' },
                { case: { $gte: ['$score', 75] }, then: 'Good' },
                { case: { $gte: ['$score', 60] }, then: 'Average' },
                { case: { $gte: ['$score', 40] }, then: 'Below Average' },
                { case: { $gte: ['$score', 0] }, then: 'Poor' }
              ],
              default: 'N/A'
            }
          },
          // Calculate accuracy percentage
          accuracy: {
            $cond: [
              { $gt: ['$totalQuestions', 0] },
              {
                $multiply: [
                  { $divide: ['$correctAnswers', '$totalQuestions'] },
                  100
                ]
              },
              0
            ]
          },
          // Format total time spent
          formattedTimeSpent: {
            $concat: [
              { $toString: { $floor: { $divide: ['$totalTimeSpent', 60] } } },
              'm ',
              { $toString: { $mod: ['$totalTimeSpent', 60] } },
              's'
            ]
          }
        }
      },

      // Search functionality
      ...(search ? [
        {
          $match: {
            $or: [
              { 'safeUserDetails.email': { $regex: search, $options: 'i' } },
              { 'safeUserDetails.phone': { $regex: search, $options: 'i' } },
              { 'safeUserDetails.fullName': { $regex: search, $options: 'i' } },
              { 'safeTestDetails.title': { $regex: search, $options: 'i' } },
              { testTitle: { $regex: search, $options: 'i' } }
            ]
          }
        }
      ] : []),

      // Sort stage
      {
        $sort: { [sortBy]: sortOrder }
      },

      // Project only necessary fields
      {
        $project: {
          _id: 1,
          testId: 1,
          testTitle: 1,
          totalQuestions: 1,
          totalTimeSpent: 1,
          formattedTimeSpent: 1,
          score: 1,
          correctAnswers: 1,
          wrongAnswers: 1,
          unattempted: 1,
          accuracy: 1,
          performanceCategory: 1,
          submittedAt: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          
          // User details
          userDetails: {
            _id: '$userId',
            email: '$safeUserDetails.email',
            phone: '$safeUserDetails.phone',
            firstName: '$safeUserDetails.firstName',
            lastName: '$safeUserDetails.lastName',
            fullName: '$safeUserDetails.fullName'
          },
          
          // Test details
          testDetails: {
            _id: '$testId',
            title: '$safeTestDetails.title',
            description: '$safeTestDetails.description',
            totalMarks: '$safeTestDetails.totalMarks',
            duration: '$safeTestDetails.duration',
            passingMarks: '$safeTestDetails.passingMarks',
            totalQuestions: '$safeTestDetails.totalQuestions'
          },
          
          // Summary metrics
          metrics: {
            score: '$score',
            correctAnswers: '$correctAnswers',
            wrongAnswers: '$wrongAnswers',
            unattempted: '$unattempted',
            accuracy: '$accuracy',
            totalTimeSpent: '$totalTimeSpent',
            formattedTimeSpent: '$formattedTimeSpent'
          }
        }
      },

      // Pagination
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    // Get total count without pagination
    const countPipeline = [
      // Match stage for basic filters (same as main pipeline)
      ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),

      // Lookup user details for search
      ...(search ? [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'mocktests',
            localField: 'testId',
            foreignField: '_id',
            as: 'testDetails'
          }
        },
        { $unwind: { path: '$testDetails', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            safeUserDetails: {
              email: { $ifNull: ['$userDetails.email', ''] },
              phone: { $ifNull: ['$userDetails.phone', ''] },
              firstName: { $ifNull: ['$userDetails.firstName', ''] },
              lastName: { $ifNull: ['$userDetails.lastName', ''] },
              fullName: {
                $concat: [
                  { $ifNull: ['$userDetails.firstName', ''] },
                  ' ',
                  { $ifNull: ['$userDetails.lastName', ''] }
                ]
              }
            },
            safeTestDetails: {
              title: { $ifNull: ['$testDetails.title', ''] }
            }
          }
        },
        {
          $match: {
            $or: [
              { 'safeUserDetails.email': { $regex: search, $options: 'i' } },
              { 'safeUserDetails.phone': { $regex: search, $options: 'i' } },
              { 'safeUserDetails.fullName': { $regex: search, $options: 'i' } },
              { 'safeTestDetails.title': { $regex: search, $options: 'i' } },
              { testTitle: { $regex: search, $options: 'i' } }
            ]
          }
        }
      ] : []),

      { $count: 'totalCount' }
    ];

    // Execute both pipelines
    const [results, countResult] = await Promise.all([
      MockTestResult.aggregate(pipeline),
      MockTestResult.aggregate(countPipeline)
    ]);

    const totalCount = countResult.length ? countResult[0].totalCount : 0;

    // Format dates for better readability
    const formattedResults = results.map(result => ({
      ...result,
      submittedAt: result.submittedAt ? new Date(result.submittedAt).toISOString() : null,
      formattedDate: result.submittedAt ? new Date(result.submittedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'N/A'
    }));

    res.json({
      success: true,
      data: formattedResults,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      summary: {
        totalTests: totalCount,
        averageScore: results.length > 0 
          ? (results.reduce((sum, item) => sum + item.score, 0) / results.length).toFixed(2)
          : 0,
        highestScore: results.length > 0 
          ? Math.max(...results.map(item => item.score))
          : 0,
        lowestScore: results.length > 0 
          ? Math.min(...results.map(item => item.score))
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching mock test history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mock test history',
      error: error.message
    });
  }
};

// Get single test result by ID with detailed information
export const getTestResultById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await MockTestResult.findById(id)
      .populate('userId', 'email phone firstName lastName')
      .populate('testId', 'title description totalMarks duration passingMarks totalQuestions')
      .populate('questionWiseResults.questionId', 'questionText options correctOption');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Test result not found'
      });
    }

    // Format the response
    const formattedResult = {
      _id: result._id,
      userDetails: {
        _id: result.userId._id,
        email: result.userId.email,
        phone: result.userId.phone,
        firstName: result.userId.firstName,
        lastName: result.userId.lastName,
        fullName: `${result.userId.firstName || ''} ${result.userId.lastName || ''}`.trim()
      },
      testDetails: {
        _id: result.testId._id,
        title: result.testId.title,
        description: result.testId.description,
        totalMarks: result.testId.totalMarks,
        duration: result.testId.duration,
        passingMarks: result.testId.passingMarks,
        totalQuestions: result.testId.totalQuestions
      },
      testTitle: result.testTitle,
      totalQuestions: result.totalQuestions,
      totalTimeSpent: result.totalTimeSpent,
      formattedTimeSpent: `${Math.floor(result.totalTimeSpent / 60)}m ${result.totalTimeSpent % 60}s`,
      score: result.score,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      unattempted: result.unattempted,
      accuracy: (result.correctAnswers / result.totalQuestions * 100).toFixed(2),
      performanceCategory: result.score >= 90 ? 'Excellent' : 
                         result.score >= 75 ? 'Good' : 
                         result.score >= 60 ? 'Average' : 
                         result.score >= 40 ? 'Below Average' : 'Poor',
      questionWiseResults: result.questionWiseResults.map(q => ({
        questionId: q.questionId._id,
        questionText: q.questionText || q.questionId.questionText,
        selectedOption: q.selectedOption,
        correctOption: q.correctOption,
        timeSpent: q.timeSpent,
        isCorrect: q.isCorrect,
        options: q.options,
        status: q.isCorrect ? 'correct' : q.selectedOption !== undefined ? 'wrong' : 'unattempted'
      })),
      submittedAt: result.submittedAt,
      formattedDate: new Date(result.submittedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };

    res.json({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    console.error('Error fetching test result by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test result',
      error: error.message
    });
  }
};

// Get user's test statistics
export const getUserTestStatistics = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await MockTestResult.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$userId',
          totalTests: { $sum: 1 },
          averageScore: { $avg: '$score' },
          highestScore: { $max: '$score' },
          lowestScore: { $min: '$score' },
          totalCorrect: { $sum: '$correctAnswers' },
          totalWrong: { $sum: '$wrongAnswers' },
          totalUnattempted: { $sum: '$unattempted' },
          totalTimeSpent: { $sum: '$totalTimeSpent' },
          recentTests: {
            $push: {
              testId: '$testId',
              testTitle: '$testTitle',
              score: '$score',
              submittedAt: '$submittedAt'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          userDetails: {
            _id: '$userDetails._id',
            email: '$userDetails.email',
            phone: '$userDetails.phone',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            fullName: {
              $concat: [
                { $ifNull: ['$userDetails.firstName', ''] },
                ' ',
                { $ifNull: ['$userDetails.lastName', ''] }
              ]
            }
          },
          totalTests: 1,
          averageScore: { $round: ['$averageScore', 2] },
          highestScore: 1,
          lowestScore: 1,
          totalCorrect: 1,
          totalWrong: 1,
          totalUnattempted: 1,
          totalTimeSpent: 1,
          formattedTotalTime: {
            $concat: [
              { $toString: { $floor: { $divide: ['$totalTimeSpent', 3600] } } },
              'h ',
              { $toString: { $floor: { $divide: [{ $mod: ['$totalTimeSpent', 3600] }, 60] } } },
              'm ',
              { $toString: { $mod: ['$totalTimeSpent', 60] } },
              's'
            ]
          },
          recentTests: { $slice: ['$recentTests', 5] }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats.length > 0 ? stats[0] : null
    });

  } catch (error) {
    console.error('Error fetching user test statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};