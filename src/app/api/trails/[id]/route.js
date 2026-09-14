import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Trail from "@/models/Trail";
import User from "@/models/User";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/permissions";

// GET - Get a specific trail
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid trail ID" },
        { status: 400 }
      );
    }

    const trail = await Trail.findById(id)
      .populate("user", "name username role")
      .lean();

    if (!trail) {
      return NextResponse.json({ error: "Trail not found" }, { status: 404 });
    }

    // Normal users can only view trails created by admins
    if (!hasAdminAccess(user)) {
      const trailCreatorId = trail.user._id || trail.user;
      const trailCreator = trail.user.role 
        ? trail.user
        : await User.findById(trailCreatorId).select("role");
      
      if (!trailCreator || !hasAdminAccess(trailCreator)) {
        return NextResponse.json(
          { error: "Trail not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ trail }, { status: 200 });
  } catch (error) {
    console.error("Error fetching trail:", error);
    return NextResponse.json(
      { error: "Failed to fetch trail" },
      { status: 500 }
    );
  }
}

// PUT - Update a trail (admin only)
export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminAccess(user)) {
      return NextResponse.json(
        { error: "Only admins can update trails" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid trail ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, location, mushrooms } = body;

    const trail = await Trail.findById(id);

    if (!trail) {
      return NextResponse.json({ error: "Trail not found" }, { status: 404 });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Trail name cannot be empty" },
          { status: 400 }
        );
      }
      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: "Trail name must be 50 characters or less" },
          { status: 400 }
        );
      }
      trail.name = name.trim();
    }

    if (location !== undefined) {
      trail.location = location;
    }

    if (mushrooms !== undefined) {
      if (!Array.isArray(mushrooms)) {
        return NextResponse.json(
          { error: "Mushrooms must be an array" },
          { status: 400 }
        );
      }
      trail.mushrooms = mushrooms;
    }

    await trail.save();

    const trailData = trail.toObject();
    return NextResponse.json({ trail: trailData }, { status: 200 });
  } catch (error) {
    console.error("Error updating trail:", error);
    return NextResponse.json(
      { error: "Failed to update trail" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a trail (admin only)
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminAccess(user)) {
      return NextResponse.json(
        { error: "Only admins can delete trails" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid trail ID" },
        { status: 400 }
      );
    }

    const trail = await Trail.findById(id);

    if (!trail) {
      return NextResponse.json({ error: "Trail not found" }, { status: 404 });
    }

    await Trail.deleteOne({ _id: id });

    return NextResponse.json(
      { message: "Trail deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting trail:", error);
    return NextResponse.json(
      { error: "Failed to delete trail" },
      { status: 500 }
    );
  }
}
