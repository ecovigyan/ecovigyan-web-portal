import mongoose from "mongoose";
import Review from "@/models/Review";
import Product from "@/models/Product";

/**
 * Recompute a product's averageRating and reviewCount from its approved
 * reviews and write them back to the product.
 *
 * Call this after anything that changes which reviews are approved:
 * approving, rejecting, or deleting one. Only approved reviews count, so a
 * product with no approved reviews correctly falls back to 0.
 *
 * Returns the values written, so callers can hand them straight back to the
 * client without a second read.
 */
export async function recalculateProductRating(productId) {
  const id =
    productId instanceof mongoose.Types.ObjectId
      ? productId
      : new mongoose.Types.ObjectId(productId);

  const [summary] = await Review.aggregate([
    { $match: { product: id, status: "approved" } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  // Round to one decimal — "4.3" rather than "4.333333333333333".
  const averageRating = summary
    ? Math.round(summary.averageRating * 10) / 10
    : 0;
  const reviewCount = summary ? summary.reviewCount : 0;

  await Product.findByIdAndUpdate(id, { averageRating, reviewCount });

  return { averageRating, reviewCount };
}

/**
 * Count of approved reviews per star value for a product, always covering
 * 1 through 5 so the UI can render an even distribution bar without
 * filling gaps itself.
 */
export async function getRatingDistribution(productId) {
  const id =
    productId instanceof mongoose.Types.ObjectId
      ? productId
      : new mongoose.Types.ObjectId(productId);

  const rows = await Review.aggregate([
    { $match: { product: id, status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach((row) => {
    distribution[row._id] = row.count;
  });

  return distribution;
}
