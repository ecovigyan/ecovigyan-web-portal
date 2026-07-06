import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";

// Irreversibly hash a string so the original value cannot be recovered
// but the result is deterministic (same input → same hash).
function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

export async function DELETE(req) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id).select("+password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.deletedAt) {
      return NextResponse.json({ error: "Account already deleted" }, { status: 400 });
    }

    // Admins cannot self-delete to prevent accidental lockout
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Admin accounts cannot be self-deleted. Contact a super-admin." },
        { status: 403 }
      );
    }

    // Delete profile picture from Cloudinary if it exists
    if (user.dp?.public_id && cloudinary?.uploader) {
      try {
        await cloudinary.uploader.destroy(user.dp.public_id);
      } catch (err) {
        console.error("Error deleting profile picture:", err);
        // Continue even if this fails
      }
    }

    // Anonymise the user record.
    // - email and username are hashed so the unique index stays satisfied
    //   and the original values are freed for future re-registration.
    // - All personal data is wiped.
    // - The document is KEPT so that Mushroom.submittedBy references
    //   remain valid; those observations display as "Anonymous".
    const userId = user._id.toString();
    await User.findByIdAndUpdate(user._id, {
      name: "",
      username: `deleted_${sha256(userId).slice(0, 16)}`,
      email: `deleted_${sha256(user.email)}@deleted.local`,
      password: null,
      bio: "",
      dp: { public_id: "", url: "" },
      resetToken: null,
      resetTokenExpiry: null,
      points: 0,
      deletedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Account deleted successfully." },
      { status: 200 }
    );
  } catch (err) {
    console.error("Account delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
