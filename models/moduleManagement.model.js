import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const moduleManagementSchema = new Schema(
  {
    subjectId:{
        type: Types.ObjectId,
        ref: "Subject",
        required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    order: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

const ModuleManagement = model("ModuleManagement", moduleManagementSchema);

export default ModuleManagement;