import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

const mocktestCategorySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        mocktestIds: [
            {
                type: Types.ObjectId,
                ref: "MockTest",
                required: true,
            }
        ],
        price:{
            type: Number,
            required: true,
            default: 0
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true
        },
        validCodes: [String],
        typeOfCategory: {
            type: String,
            required: true, 
        },
    },
    { timestamps: true }
);

const MocktestCategory = mongoose.model("MocktestCategory", mocktestCategorySchema);
export default MocktestCategory;