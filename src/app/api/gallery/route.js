import { connectDB } from "@/lib/mongodb";
import Gallery from "@/models/Gallery";
import { NextResponse } from "next/server";

// GET - Fetch paginated gallery images + aggregate stats
// Query params: ?page=1&limit=12&category=Nature+Art
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "12")));
    const category = searchParams.get("category");

    const query = { status: "active" };
    if (category && category !== "All") query.category = category;

    const skip = (page - 1) * limit;

    const [images, total, statsAgg] = await Promise.all([
      Gallery.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("uploadedBy", "name username")
        .select("-__v"),
      Gallery.countDocuments(query),
      // Stats always computed from ALL active images regardless of category filter
      Gallery.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: null,
            totalArtworks: { $sum: 1 },
            totalSchools: { $addToSet: "$schoolName" },
            totalStudents: { $addToSet: "$studentName" },
          },
        },
        {
          $project: {
            _id: 0,
            totalArtworks: 1,
            totalSchools: { $size: "$totalSchools" },
            totalStudents: { $size: "$totalStudents" },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || { totalArtworks: 0, totalSchools: 0, totalStudents: 0 };

    return NextResponse.json({
      images,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    }, { status: 200 });
  } catch (error) {
    console.error("Gallery fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery images" },
      { status: 500 }
    );
  }
}
