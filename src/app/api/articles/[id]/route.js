import { connectDB } from "@/lib/mongodb";
import Article from "@/models/Article";
import cloudinary from "@/lib/cloudinary";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/lib/auth";
import { sanitizeArticleHtml } from "@/lib/articleContent.server";
import { getArticleTextLength } from "@/lib/articleContent.shared";
import {
  ARTICLE_CONTENT_MAX_LENGTH,
  ARTICLE_CONTENT_MIN_LENGTH,
  ARTICLE_TITLE_MAX_LENGTH,
  ARTICLE_TITLE_MIN_LENGTH,
} from "@/lib/articleValidation";

// GET - Fetch a single article by ID (public)
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid article ID" },
        { status: 400 }
      );
    }

    const article = await Article.findOne({
      _id: id,
      status: "active",
    })
      .populate("uploadedBy", "name username dp")
      .select("-__v");

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const articleData = {
      _id: article._id.toString(),
      title: article.title,
      content: sanitizeArticleHtml(article.content),
      images: article.images,
      uploadedBy: article.uploadedBy,
      status: article.status,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };

    return NextResponse.json({ article: articleData }, { status: 200 });
  } catch (error) {
    console.error("Article fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// PUT - Update article
// Accepts JSON: { title, content, image1: {url, publicId} | null, image2: {url, publicId} | null,
//                 keepImage1: bool, keepImage2: bool }
// Images are uploaded client-side to Cloudinary before this call.
export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "writer" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only writers and admins can perform this action" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid article ID" },
        { status: 400 }
      );
    }

    const article = await Article.findById(id);

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      title: rawTitle,
      content: rawContent,
      image1,      // { url, publicId } | null
      image2,      // { url, publicId } | null
      keepImage1 = true,
      keepImage2 = true,
    } = body;

    const title = rawTitle?.trim();
    const content =
      rawContent === undefined || rawContent === null
        ? undefined
        : sanitizeArticleHtml(rawContent);

    if (title !== undefined && title !== null) {
      if (!title || title.length < ARTICLE_TITLE_MIN_LENGTH || title.length > ARTICLE_TITLE_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Title must be between ${ARTICLE_TITLE_MIN_LENGTH} and ${ARTICLE_TITLE_MAX_LENGTH} characters` },
          { status: 400 }
        );
      }
      article.title = title;
    }

    if (content !== undefined && content !== null) {
      const contentLength = getArticleTextLength(content);
      if (!content || contentLength < ARTICLE_CONTENT_MIN_LENGTH || contentLength > ARTICLE_CONTENT_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Content must be between ${ARTICLE_CONTENT_MIN_LENGTH} and ${ARTICLE_CONTENT_MAX_LENGTH} characters` },
          { status: 400 }
        );
      }
      article.content = content;
    }

    let updatedImages = [...article.images];

    // Handle slot 0 (image1)
    if (image1?.url && image1?.publicId) {
      // New image uploaded — delete old if present
      if (updatedImages[0]?.public_id) {
        try { await cloudinary.uploader.destroy(updatedImages[0].public_id); } catch {}
      }
      updatedImages[0] = { url: image1.url, public_id: image1.publicId };
    } else if (!keepImage1) {
      // Remove image1
      if (updatedImages[0]?.public_id) {
        try { await cloudinary.uploader.destroy(updatedImages[0].public_id); } catch {}
      }
      updatedImages = updatedImages.slice(1);
    }

    // Handle slot 1 (image2)
    if (image2?.url && image2?.publicId) {
      if (updatedImages.length >= 2) {
        if (updatedImages[1]?.public_id) {
          try { await cloudinary.uploader.destroy(updatedImages[1].public_id); } catch {}
        }
        updatedImages[1] = { url: image2.url, public_id: image2.publicId };
      } else {
        updatedImages.push({ url: image2.url, public_id: image2.publicId });
      }
    } else if (!keepImage2) {
      if (updatedImages[1]?.public_id) {
        try { await cloudinary.uploader.destroy(updatedImages[1].public_id); } catch {}
      }
      updatedImages = updatedImages.slice(0, 1);
    }

    article.images = updatedImages;
    await article.save();
    await article.populate("uploadedBy", "name username dp");

    return NextResponse.json({
      message: "Article updated successfully",
      article: {
        id: article._id.toString(),
        title: article.title,
        content: sanitizeArticleHtml(article.content),
        images: article.images,
        uploadedBy: article.uploadedBy,
        updatedAt: article.updatedAt,
      },
    });
  } catch (error) {
    console.error("Article update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update article" },
      { status: 500 }
    );
  }
}

// DELETE - Delete article
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "writer" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only writers and admins can perform this action" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid article ID" },
        { status: 400 }
      );
    }

    const article = await Article.findById(id);

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    for (const image of article.images) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);
      }
    }

    await Article.findByIdAndDelete(id);

    return NextResponse.json({ message: "Article deleted successfully" });
  } catch (error) {
    console.error("Article delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete article" },
      { status: 500 }
    );
  }
}
