import { connectDB } from "@/lib/mongodb";
import Article from "@/models/Article";
import { NextResponse } from "next/server";
import { sanitizeArticleHtml } from "@/lib/articleContent.server";

// GET - Fetch all active articles
export async function GET() {
  try {
    await connectDB();

    const articles = await Article.find({ status: "active" })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name username dp")
      .select("-__v");

    const sanitizedArticles = articles.map((article) => ({
      ...article.toObject(),
      content: sanitizeArticleHtml(article.content),
    }));

    return NextResponse.json({ articles: sanitizedArticles }, { status: 200 });
  } catch (error) {
    console.error("Articles fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}


