import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendMushroomApprovedEmail } from "@/lib/mushroomApprovalEmail";
import { hasAdminAccess } from "@/lib/permissions";

// Bulk operations endpoint for efficient batch processing
export async function POST(req) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminAccess(admin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= PARSE BODY ================= */
    const body = await req.json();
    const { action, mushroomIds } = body;

    if (!action || !Array.isArray(mushroomIds) || mushroomIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide action and mushroomIds array." },
        { status: 400 }
      );
    }

    /* ================= BULK APPROVE ================= */
    if (action === "approve") {
      // Step 1: Find mushrooms that are NOT already approved (to award points correctly)
      const mushroomsToApprove = await Mushroom.find({
        _id: { $in: mushroomIds },
        status: { $ne: "approved" }, // Only those not already approved
      })
        .select(
          "_id commonName scientificName fruitingSurface texture photoDateTime images submittedBy"
        )
        .populate("submittedBy", "name username email");

      // Step 2: Bulk update all mushrooms to approved status (single MongoDB operation)
      const updateResult = await Mushroom.updateMany(
        { _id: { $in: mushroomIds } },
        {
          $set: {
            status: "approved",
            reviewedBy: admin._id,
            approvedAt: new Date(),
            rejectionReason: null,
          },
        }
      );

      // Step 3: Award points to submitters (collect unique user IDs and increment their points)
      // Using aggregation pipeline to count points per user
      const userPointsMap = new Map();
      for (const mushroom of mushroomsToApprove) {
        if (mushroom.submittedBy) {
          const userId = (
            mushroom.submittedBy?._id || mushroom.submittedBy
          ).toString();
          userPointsMap.set(userId, (userPointsMap.get(userId) || 0) + 1);
        }
      }

      // Bulk update user points (one operation per user, not per mushroom)
      const pointsUpdatePromises = Array.from(userPointsMap.entries()).map(
        ([userId, points]) =>
          User.findByIdAndUpdate(userId, { $inc: { points } })
      );

      if (pointsUpdatePromises.length > 0) {
        await Promise.all(pointsUpdatePromises);
      }

      const emailResults = await Promise.allSettled(
        mushroomsToApprove.map((mushroom) =>
          sendMushroomApprovedEmail({
            mushroom,
            recipient: mushroom.submittedBy,
          })
        )
      );

      const emailedCount = emailResults.filter(
        (result) => result.status === "fulfilled" && result.value?.sent
      ).length;

      emailResults.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Failed to send mushroom approval email:", result.reason);
        }
      });

      return NextResponse.json(
        {
          message: `Successfully approved ${updateResult.modifiedCount} mushroom(s)`,
          modifiedCount: updateResult.modifiedCount,
          pointsAwarded: mushroomsToApprove.length,
          emailedCount,
        },
        { status: 200 }
      );
    }

    /* ================= BULK REJECT ================= */
    if (action === "reject") {
      const { rejectionReason } = body;

      // Step 1: Find mushrooms that ARE approved (to remove points correctly)
      const approvedMushrooms = await Mushroom.find({
        _id: { $in: mushroomIds },
        status: "approved",
      }).select("_id submittedBy");

      // Step 2: Bulk update all mushrooms to rejected status
      const updateResult = await Mushroom.updateMany(
        { _id: { $in: mushroomIds } },
        {
          $set: {
            status: "rejected",
            reviewedBy: admin._id,
            rejectionReason: rejectionReason || null,
          },
        }
      );

      // Step 3: Remove points from users whose mushrooms were previously approved
      const userPointsMap = new Map();
      for (const mushroom of approvedMushrooms) {
        if (mushroom.submittedBy) {
          const userId = mushroom.submittedBy.toString();
          userPointsMap.set(userId, (userPointsMap.get(userId) || 0) + 1);
        }
      }

      const pointsUpdatePromises = Array.from(userPointsMap.entries()).map(
        ([userId, points]) =>
          User.findByIdAndUpdate(userId, { $inc: { points: -points } })
      );

      if (pointsUpdatePromises.length > 0) {
        await Promise.all(pointsUpdatePromises);
      }

      return NextResponse.json(
        {
          message: `Successfully rejected ${updateResult.modifiedCount} mushroom(s)`,
          modifiedCount: updateResult.modifiedCount,
          pointsRemoved: approvedMushrooms.length,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Bulk operations error:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}
