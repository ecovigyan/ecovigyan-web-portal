import { connectDB } from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "writer" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only writers and admins can upload gallery images" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      imageUrl,
      publicId,
      studentName: rawStudentName,
      schoolName: rawSchoolName,
      description: rawDescription = "",
      title = "",
      category = "",
      program = "",
      year = "",
      theme = "",
    } = body;

    const studentName = rawStudentName?.trim();
    const schoolName = rawSchoolName?.trim();
    const description = rawDescription?.trim();

    if (!imageUrl || !publicId || !studentName || !schoolName) {
      return NextResponse.json(
        { error: "Image URL, student name, and school name are required" },
        { status: 400 }
      );
    }

    if (studentName.length < 2 || studentName.length > 100) {
      return NextResponse.json(
        { error: "Student name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (schoolName.length < 2 || schoolName.length > 100) {
      return NextResponse.json(
        { error: "School name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        { error: "Description must be less than 500 characters" },
        { status: 400 }
      );
    }

    const galleryItem = await Gallery.create({
      image: {
        public_id: publicId,
        url: imageUrl,
      },
      studentName,
      schoolName,
      description,
      title,
      category,
      program,
      year,
      theme,
      uploadedBy: user._id,
      status: "active",
    });

    await galleryItem.populate("uploadedBy", "name username");

    return NextResponse.json(
      {
        message: "Image uploaded successfully",
        galleryItem: {
          id: galleryItem._id.toString(),
          image: galleryItem.image,
          studentName: galleryItem.studentName,
          schoolName: galleryItem.schoolName,
          description: galleryItem.description,
          uploadedBy: galleryItem.uploadedBy,
          createdAt: galleryItem.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gallery upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
