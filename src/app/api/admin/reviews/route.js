import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Review from "@/models/Review";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= QUERY ================= */
    const { searchParams } = new URL(req.url);

    // Counts drive the sidebar badge and the status tabs
    if (searchParams.get("countsOnly") === "true") {
      const [pending, approved, rejected] = await Promise.all([
        Review.countDocuments({ status: "pending" }),
        Review.countDocuments({ status: "approved" }),
        Review.countDocuments({ status: "rejected" }),
      ]);

      return NextResponse.json(
        { counts: { pending, approved, rejected } },
        { status: 200 }
      );
    }

    const status = searchParams.get("status") || "pending";
    if (!["all", "pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    const productId = searchParams.get("productId");
    if (productId && !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit")) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = status === "all" ? {} : { status };
    if (productId) query.product = productId;

    const [total, reviews] = await Promise.all([
      Review.countDocuments(query),
      Review.find(query)
        .populate("user", "name username email dp")
        .populate("product", "name image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      { reviews, total, page, totalPages, hasMore: page < totalPages },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin list reviews error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
