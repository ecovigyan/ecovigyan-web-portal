import { connectDB } from "@/lib/mongodb";
import Article from "@/models/Article";
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
        { error: "Only writers and admins can upload articles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title: rawTitle, content: rawContent, images = [] } = body;

    const title = rawTitle?.trim();
    const content = rawContent?.trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    if (title.length < 5 || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be between 5 and 200 characters" },
        { status: 400 }
      );
    }

    if (content.length < 50 || content.length > 10000) {
      return NextResponse.json(
        { error: "Content must be between 50 and 10000 characters" },
        { status: 400 }
      );
    }

    if (images.length > 2) {
      return NextResponse.json(
        { error: "Maximum 2 images allowed" },
        { status: 400 }
      );
    }

    // Validate image objects
    const uploadedImages = images
      .filter((img) => img?.url && img?.publicId)
      .map((img) => ({ url: img.url, public_id: img.publicId }));

    const article = await Article.create({
      title,
      content,
      images: uploadedImages,
      uploadedBy: user._id,
      status: "active",
    });

    await article.populate("uploadedBy", "name username dp");

    return NextResponse.json(
      {
        message: "Article uploaded successfully",
        article: {
          id: article._id.toString(),
          title: article.title,
          content: article.content,
          images: article.images,
          uploadedBy: article.uploadedBy,
          createdAt: article.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Article upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload article" },
      { status: 500 }
    );
  }
}
