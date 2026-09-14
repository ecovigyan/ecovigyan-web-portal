import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/auth";
import { hasAdminAccess, isSuperAdmin } from "@/lib/permissions";

// Ban/Unban a user (admin only)
export async function POST(req) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    // Banning is a trust operation — superadmin only
    if (!isSuperAdmin(admin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= PARSE BODY ================= */
    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action are required" },
        { status: 400 }
      );
    }

    if (!["ban", "unban"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'ban' or 'unban'" },
        { status: 400 }
      );
    }

    /* ================= FIND USER ================= */
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admin from banning themselves
    if (user._id.toString() === admin._id.toString()) {
      return NextResponse.json(
        { error: "You cannot ban yourself" },
        { status: 400 }
      );
    }

    // Prevent banning any admin-tier account, subadmins included
    if (hasAdminAccess(user)) {
      return NextResponse.json(
        { error: "Cannot ban another admin" },
        { status: 403 }
      );
    }

    /* ================= UPDATE USER ================= */
    user.isBanned = action === "ban";
    await user.save();

    return NextResponse.json(
      {
        message: `User ${action === "ban" ? "banned" : "unbanned"} successfully`,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          isBanned: user.isBanned,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Ban user error:", error);
    return NextResponse.json(
      { error: "Failed to update user ban status" },
      { status: 500 }
    );
  }
}
