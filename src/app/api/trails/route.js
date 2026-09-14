import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Trail from "@/models/Trail";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/permissions";

// GET - Get all trails
export async function GET(req) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    let trails;
    
    if (hasAdminAccess(user)) {
      trails = await Trail.find()
        .populate("user", "name username")
        .sort({ createdAt: -1 })
        .lean();
    } else {
      const adminUsers = await User.find({ role: "admin" }).select("_id");
      const adminIds = adminUsers.map(u => u._id);
      
      trails = await Trail.find({ user: { $in: adminIds } })
        .populate("user", "name username")
        .sort({ createdAt: -1 })
        .lean();
    }

    return NextResponse.json({ trails }, { status: 200 });
  } catch (error) {
    console.error("Error fetching trails:", error);
    return NextResponse.json(
      { error: "Failed to fetch trails" },
      { status: 500 }
    );
  }
}

// POST - Create a new trail (admin only)
export async function POST(req) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminAccess(user)) {
      return NextResponse.json(
        { error: "Only admins can create trails" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, location, mushrooms } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Trail name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: "Trail name must be 50 characters or less" },
        { status: 400 }
      );
    }

    if (!mushrooms || !Array.isArray(mushrooms) || mushrooms.length === 0) {
      return NextResponse.json(
        { error: "Trail must have at least one mushroom" },
        { status: 400 }
      );
    }

    const trail = await Trail.create({
      name: name.trim(),
      user: user._id,
      location: location || {},
      mushrooms: mushrooms,
    });

    const trailData = trail.toObject();
    return NextResponse.json({ trail: trailData }, { status: 201 });
  } catch (error) {
    console.error("Error creating trail:", error);
    return NextResponse.json(
      { error: "Failed to create trail" },
      { status: 500 }
    );
  }
}
