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

export async function PATCH(req) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= PARSE BODY ================= */
    const body = await req.json();
    const { userId, name, username, email, dp, role } = body;
    const allowedRoles = ["user", "writer", "admin"];

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Apply updates
    if (name !== undefined) userToUpdate.name = name;
    if (username !== undefined) {
      // Check if username is already taken by someone else
      const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: userId } });
      if (existing) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }
      userToUpdate.username = username.toLowerCase();
    }
    if (email !== undefined) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existing) {
        return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
      }
      userToUpdate.email = email.toLowerCase();
    }
    if (dp !== undefined) {
      userToUpdate.dp = dp;
    }
    if (role !== undefined && role !== userToUpdate.role) {
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      // Don't allow changing own role if self
      if (userId === admin._id.toString()) {
        return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
      }
      userToUpdate.role = role;
    }

    await userToUpdate.save();

    return NextResponse.json({
      message: "User updated successfully",
      user: {
        id: userToUpdate._id.toString(),
        name: userToUpdate.name,
        username: userToUpdate.username,
        email: userToUpdate.email,
        dp: userToUpdate.dp,
        role: userToUpdate.role,
        points: userToUpdate.points,
        isBanned: userToUpdate.isBanned,
      }
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
