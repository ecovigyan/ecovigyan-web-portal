import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Review from "@/models/Review";
import { getAuthenticatedUser } from "@/lib/auth";
import { recalculateProductRating } from "@/lib/reviewStats";
import { hasAdminAccess, isSuperAdmin } from "@/lib/permissions";

/* ================= APPROVE / REJECT ================= */

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminAccess(admin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    const { status, rejectionReason } = await req.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be approved or rejected" },
        { status: 400 }
      );
    }

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    review.status = status;
    review.reviewedBy = admin._id;

    if (status === "approved") {
      review.approvedAt = new Date();
      review.rejectionReason = undefined;
    } else {
      review.approvedAt = undefined;
      if (typeof rejectionReason === "string" && rejectionReason.trim()) {
        review.rejectionReason = rejectionReason.trim();
      }
    }

    await review.save();

    // The set of approved reviews changed either way — approving adds one,
    // rejecting a previously approved one removes it.
    const rating = await recalculateProductRating(review.product);

    return NextResponse.json(
      { message: `Review ${status} successfully`, rating },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin update review error:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

/* ================= DELETE ================= */

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    // Deleting destroys the record — superadmin only. Subadmins reject instead.
    if (!isSuperAdmin(admin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    const review = await Review.findById(id).select("product");
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const productId = review.product;
    await review.deleteOne();
    await recalculateProductRating(productId);

    return NextResponse.json({ message: "Review deleted" }, { status: 200 });
  } catch (error) {
    console.error("Admin delete review error:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
