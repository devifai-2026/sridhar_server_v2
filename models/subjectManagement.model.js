import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const subjectManagementSchema = new Schema(
  {
    subjectName: { type: String, required: true },
    description: { type: String, required: true },
    photo:{type: String, required: true},
    numberOfModules: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

const subjectManagement = model("subjectManagement", subjectManagementSchema);

export default subjectManagement;
