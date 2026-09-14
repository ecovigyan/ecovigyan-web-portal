import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Review from "@/models/Review";
import Product from "@/models/Product";
import { getAuthenticatedUser } from "@/lib/auth";
import { getRatingDistribution } from "@/lib/reviewStats";

/* ================= LIST APPROVED REVIEWS ================= */

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 10, 1), 50);
    const skip = (page - 1) * limit;

    // Public listing shows approved reviews only — pending and rejected ones
    // are never exposed here.
    const query = { product: id, status: "approved" };

    const [total, reviews, distribution] = await Promise.all([
      Review.countDocuments(query),
      Review.find(query)
        .populate("user", "name username dp")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("rating title comment user createdAt")
        .lean(),
      getRatingDistribution(id),
    ]);

    const totalPages = Math.ceil(total / limit);

    // The caller may also want to know whether the signed-in user already has
    // a review in flight, so they can be shown its status instead of a form.
    let myReview = null;
    const { user } = await getAuthenticatedUser();
    if (user) {
      myReview = await Review.findOne({ product: id, user: user._id })
        .select("rating title comment status rejectionReason createdAt")
        .lean();
    }

    return NextResponse.json(
      {
        reviews,
        distribution,
        myReview,
        total,
        page,
        totalPages,
        hasMore: page < totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("List reviews error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

/* ================= SUBMIT A REVIEW ================= */

export async function POST(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const product = await Product.findById(id).select("_id");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { rating, title, comment } = await req.json();

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be a whole number from 1 to 5" },
        { status: 400 }
      );
    }

    const existing = await Review.findOne({ product: id, user: user._id }).select("status");
    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.status === "pending"
              ? "You already have a review awaiting approval for this product"
              : "You have already reviewed this product",
        },
        { status: 409 }
      );
    }

    await Review.create({
      product: id,
      user: user._id,
      rating: numericRating,
      title: typeof title === "string" ? title.trim() : undefined,
      comment: typeof comment === "string" ? comment.trim() : undefined,
      // status defaults to "pending" — reviews are not public until approved,
      // so the product's rating is deliberately not recalculated here.
    });

    return NextResponse.json(
      { message: "Review submitted. It will appear once an admin approves it." },
      { status: 201 }
    );
  } catch (error) {
    // Unique index on (product, user) — a duplicate that raced past the check
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "You have already reviewed this product" },
        { status: 409 }
      );
    }

    console.error("Create review error:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
