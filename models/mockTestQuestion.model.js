import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

const mockTestQuestionSchema = new Schema(
    {
        testId: {
            type: Types.ObjectId,
            ref: "MockTest",
            required: true,
        },
        questionText: String,
        isImageExists: Boolean,
        questionImage: String,
        timeQuestion: String,

        options: [
            {
                optionNumber: Number,
                answer: String,
            }
        ],
        correctAnswerIndex: Number,
        solutionImage: String,
        isActive: { type: Boolean, required: true, default: true },

    },
    { timestamps: true }
)



const MockTestQuestion = mongoose.models.MockTestQuestion || mongoose.model("MockTestQuestion", mockTestQuestionSchema);

export default MockTestQuestion;