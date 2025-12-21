import mongoose from "mongoose";

const mockTestResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MockTest',
    required: true
  },
  testTitle: {
    type: String,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  totalTimeSpent: {
    type: Number, // in seconds
    required: true
  },
  score: {
    type: Number, // percentage
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  wrongAnswers: {
    type: Number,
    required: true
  },
  unattempted: {
    type: Number,
    required: true
  },
  questionWiseResults: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockTestQuestion',
      required: true
    },
    questionText: String,
    selectedOption: Number, // index of selected option (0,1,2,3)
    correctOption: Number, // index of correct option (0,1,2,3)
    timeSpent: Number, // in seconds
    isCorrect: Boolean,
    options: [{
      optionNumber: Number,
      answer: String,
      isImage: Boolean
    }]
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


export default mongoose.model("MockTestResult", mockTestResultSchema);