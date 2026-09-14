import { connectDB } from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import cloudinary from "@/lib/cloudinary";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/permissions";

// PUT - Update gallery item
export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "writer" && !hasAdminAccess(user)) {
      return NextResponse.json(
        { error: "Only writers and admins can perform this action" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const galleryItem = await Gallery.findById(id);

    if (!galleryItem) {
      return NextResponse.json(
        { error: "Gallery item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { studentName, schoolName, description, title, category, program, year, theme } = body;

    // Validation
    if (studentName !== undefined) {
      const trimmed = studentName.trim();
      if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
        return NextResponse.json(
          { error: "Student name must be between 2 and 100 characters" },
          { status: 400 }
        );
      }
      galleryItem.studentName = trimmed;
    }

    if (schoolName !== undefined) {
      const trimmed = schoolName.trim();
      if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
        return NextResponse.json(
          { error: "School name must be between 2 and 100 characters" },
          { status: 400 }
        );
      }
      galleryItem.schoolName = trimmed;
    }

    if (description !== undefined) {
      const trimmed = description.trim();
      if (trimmed.length > 500) {
        return NextResponse.json(
          { error: "Description must be less than 500 characters" },
          { status: 400 }
        );
      }
      galleryItem.description = trimmed;
    }

    // New optional fields
    if (title !== undefined) {
      galleryItem.title = title.trim();
    }

    if (category !== undefined) {
      galleryItem.category = category.trim();
    }

    if (program !== undefined) {
      galleryItem.program = program.trim();
    }

    if (year !== undefined) {
      galleryItem.year = year.trim();
    }

    if (theme !== undefined) {
      galleryItem.theme = theme.trim();
    }

    await galleryItem.save();
    await galleryItem.populate("uploadedBy", "name username");

    return NextResponse.json({
      message: "Gallery item updated successfully",
      galleryItem: {
        id: galleryItem._id.toString(),
        image: galleryItem.image,
        studentName: galleryItem.studentName,
        schoolName: galleryItem.schoolName,
        description: galleryItem.description,
        uploadedBy: galleryItem.uploadedBy,
        updatedAt: galleryItem.updatedAt,
      },
    });
  } catch (error) {
    console.error("Gallery update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update gallery item" },
      { status: 500 }
    );
  }
}

// DELETE - Delete gallery item
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "writer" && !hasAdminAccess(user)) {
      return NextResponse.json(
        { error: "Only writers and admins can perform this action" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const galleryItem = await Gallery.findById(id);

    if (!galleryItem) {
      return NextResponse.json(
        { error: "Gallery item not found" },
        { status: 404 }
      );
    }

    // Delete image from Cloudinary
    try {
      await cloudinary.uploader.destroy(galleryItem.image.public_id);
    } catch (cloudinaryError) {
      console.error("Cloudinary delete error:", cloudinaryError);
    }

    // Delete from database
    await Gallery.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Gallery item deleted successfully",
    });
  } catch (error) {
    console.error("Gallery delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete gallery item" },
      { status: 500 }
    );
  }
}
