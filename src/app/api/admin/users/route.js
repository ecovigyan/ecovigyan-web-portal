import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
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

    /* ================= PARSE PARAMS ================= */
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.max(parseInt(searchParams.get("limit")) || 20, 1);
    const search = searchParams.get("search") || "";
    
    const skip = (page - 1) * limit;

    // Search query filter
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } }
      ];
    }

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const users = await User.find(query)
      .select("-password -resetToken -resetTokenExpiry")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages
    });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users list" },
      { status: 500 }
    );
  }
}
