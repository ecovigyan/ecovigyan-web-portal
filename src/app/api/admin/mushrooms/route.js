import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import User from "@/models/User";
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
    
    // Check if requesting counts only
    const countsOnly = searchParams.get("countsOnly") === "true";
    
    // Check if requesting system imports
    const systemImportsOnly = searchParams.get("systemImports") === "true";

    if (countsOnly) {
      // Get system user ID for counting system imports
      const systemUser = await User.findOne({
        $or: [
          { email: "system@ecovigyan.org" },
          { username: "system" },
          { name: "System Import" },
        ],
      });

      // Return counts for all statuses (excluding system imports from regular counts)
      const systemUserQuery = systemUser ? { submittedBy: { $ne: systemUser._id } } : {};
      const [pendingCount, approvedCount, rejectedCount, systemImportsCount] = await Promise.all([
        Mushroom.countDocuments({ status: "pending", ...systemUserQuery }),
        Mushroom.countDocuments({ status: "approved", ...systemUserQuery }),
        Mushroom.countDocuments({ status: "rejected", ...systemUserQuery }),
        systemUser
          ? Mushroom.countDocuments({ submittedBy: systemUser._id })
          : Promise.resolve(0),
      ]);

      return NextResponse.json(
        {
          counts: {
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
            systemImports: systemImportsCount,
          },
        },
        { status: 200 }
      );
    }

    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.max(parseInt(searchParams.get("limit")) || 24, 1);
    const skip = (page - 1) * limit;

    if (systemImportsOnly) {
      // Get system user ID
      const systemUser = await User.findOne({
        $or: [
          { email: "system@ecovigyan.org" },
          { username: "system" },
          { name: "System Import" },
        ],
      });

      if (!systemUser) {
        return NextResponse.json({ mushrooms: [], total: 0, page: 1, totalPages: 0 }, { status: 200 });
      }

      // Get total count
      const total = await Mushroom.countDocuments({ submittedBy: systemUser._id });
      const totalPages = Math.ceil(total / limit);

      // Fetch mushrooms with pagination
      const mushrooms = await Mushroom.find({ submittedBy: systemUser._id })
        .populate("submittedBy", "name username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "commonName images location status submittedBy createdAt"
        );

      return NextResponse.json({ 
        mushrooms, 
        total, 
        page, 
        totalPages,
        hasMore: page < totalPages 
      }, { status: 200 });
    }

    const status = searchParams.get("status") || "all";

    if (!["all", "pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status filter" },
        { status: 400 }
      );
    }

    // Get system user ID to exclude from regular submissions
    const systemUser = await User.findOne({
      $or: [
        { email: "system@ecovigyan.org" },
        { username: "system" },
        { name: "System Import" },
      ],
    });

    // Build query — "all" returns every status, specific filters scope by status
    const query = status === "all" ? {} : { status };
    if (systemUser) {
      query.submittedBy = { $ne: systemUser._id };
    }

    const total = await Mushroom.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const mushrooms = await Mushroom.find(query)
      .populate("submittedBy", "name username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "commonName images location status submittedBy createdAt"
      );

    return NextResponse.json(
      {
        mushrooms,
        total,
        page,
        totalPages,
        hasMore: page < totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin list mushrooms error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mushrooms" },
      { status: 500 }
    );
  }
}
