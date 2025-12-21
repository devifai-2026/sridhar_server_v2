import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const couponCodeSchema = new Schema(
  {
    couponCode: { type: String, required: true },
    discountedPrice: { type: Number, required: true },
  },
  { _id: false }
);

const courseSchema = new Schema({
  name: { type: String, required: true },
  duration: { type: Number, required: true, min: 1, max: 12 }, // months 1-12
   totalChapters: { type: Number, required: true },
  totalTopics: { type: Number, required: true },
  description: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  isActive: { type: Boolean, required: true, default: true },
  isCouponCode: { type: Boolean, default: false },
  courseImgUrl: {
    type: String,
    required: true,
    default: "https://ibb.co/HTPBKK37",
  },
  couponCode: {
    type: [couponCodeSchema],
    default: undefined,
    validate: {
      validator: function (val) {
        // Default (document) path
        let isCouponCodeVal = this.isCouponCode;

        // If it's a Mongoose query (update), get the update doc
        if (
          typeof isCouponCodeVal === "undefined" &&
          typeof this.getUpdate === "function"
        ) {
          const update = this.getUpdate();

          // For $set style updates
          if (update && typeof update.isCouponCode !== "undefined") {
            isCouponCodeVal = update.isCouponCode;
          }
          // For direct field updates
          if (
            update &&
            update.$set &&
            typeof update.$set.isCouponCode !== "undefined"
          ) {
            isCouponCodeVal = update.$set.isCouponCode;
          }
        }

        if (isCouponCodeVal) {
          return Array.isArray(val) && val.length > 0;
        } else {
          // Accept null/undefined/empty
          return val === undefined || val === null;
        }
      },
      message: (props) =>
        props.value && props.value.length
          ? "couponCode should be null when isCouponCode is false"
          : "couponCode array required when isCouponCode is true",
    },
  },
  CreatedBy: { type: Types.ObjectId, required: true, ref: "Admin" },
});

const Course = model("Course", courseSchema);

export default Course;
