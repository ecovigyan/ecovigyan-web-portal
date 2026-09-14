import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";
import { getAuthenticatedUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    /* ================= FETCH MUSHROOM ================= */
    const { id } = await params;

    const mushroom = await Mushroom.findById(id);
    if (!mushroom) {
      return NextResponse.json(
        { error: "Mushroom not found" },
        { status: 404 }
      );
    }

    /* ================= AUTHORIZATION ================= */
    const isOwner = mushroom.submittedBy.toString() === user._id.toString();
    // Deleting someone else's observation is superadmin only — subadmins
    // moderate by rejecting rather than destroying the record.
    const canDeleteAny = isSuperAdmin(user);

    if (!isOwner && !canDeleteAny) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own submissions" },
        { status: 403 }
      );
    }

    /* ================= REMOVE POINTS IF APPROVED ================= */
    if (mushroom.status === "approved" && mushroom.submittedBy) {
      await User.findByIdAndUpdate(mushroom.submittedBy, {
        $inc: { points: -1 },
      });
    }

    /* ================= DELETE IMAGES FROM CLOUDINARY ================= */
    if (mushroom.images && mushroom.images.length > 0) {
      for (const image of mushroom.images) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (cloudinaryError) {
          console.error("Cloudinary delete error:", cloudinaryError);
        }
      }
    }

    /* ================= DELETE FROM DATABASE ================= */
    await Mushroom.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Mushroom deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete mushroom error:", error);
    return NextResponse.json(
      { error: "Failed to delete mushroom" },
      { status: 500 }
    );
  }
}
