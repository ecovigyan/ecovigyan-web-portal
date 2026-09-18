import mongoose from "mongoose";

// Delete cached model in development to ensure schema changes take effect
if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.Review;
}

const ReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Set when a signed-in member writes the review. Reviews do not require
    // an account, so for guests this is absent and the reviewer is
    // identified only by the name and occupation they typed.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    occupation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // No longer collected by the form; kept so older reviews still load.
    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    /* ================= MODERATION ================= */

    // Reviews are invisible to the public until an admin approves them, so a
    // new review always starts pending regardless of who wrote it.
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// One review per signed-in member per product, enforced in the database so a
// double submit cannot slip past the check in the route.
//
// Partial, not plain unique: a plain unique index treats a missing `user` as
// null, so the second guest review on any product would collide with the
// first. The filter limits uniqueness to reviews that have a user. It has a
// new name because it replaces the older plain index "product_1_user_1";
// see dropLegacyReviewIndex() in lib/reviewStats.js.
ReviewSchema.index(
  { product: 1, user: 1 },
  {
    unique: true,
    name: "product_1_user_1_members",
    partialFilterExpression: { user: { $type: "objectId" } },
  }
);

// Serving the approved reviews for a product, newest first.
ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
