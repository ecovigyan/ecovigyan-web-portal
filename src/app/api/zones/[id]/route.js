import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Zone from "@/models/Zone";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/permissions";

// GET - Get a specific zone
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
        { error: "Invalid zone ID" },
        { status: 400 }
      );
    }

    const zone = await Zone.findById(id)
      .populate("user", "name username role")
      .lean();

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ zone }, { status: 200 });
  } catch (error) {
    console.error("Error fetching zone:", error);
    return NextResponse.json(
      { error: "Failed to fetch zone" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a zone (admin only)
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!hasAdminAccess(user)) {
      return NextResponse.json(
        { error: "Only admins can delete zones" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid zone ID" },
        { status: 400 }
      );
    }

    const zone = await Zone.findById(id);

    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    await Zone.deleteOne({ _id: id });

    return NextResponse.json(
      { message: "Zone deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting zone:", error);
    return NextResponse.json(
      { error: "Failed to delete zone" },
      { status: 500 }
    );
  }
}
