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

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    comment: {
      type: String,
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

// One review per user per product. Enforced in the database so a double
// submit cannot slip past the check in the route.
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Serving the approved reviews for a product, newest first.
ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
