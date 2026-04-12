import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import { getAuthenticatedUser } from "@/lib/auth";


export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const query = { status: "approved" };
    if (category) query.category = category;

    const mushrooms = await Mushroom.find(query)
      .select(
        "commonName images location photoDateTime submittedBy ecologicalRole texture underside fruitingSurface stemPresence commonUses scientificName description status approvedAt createdAt"
      )
      .populate("submittedBy", "name username dp")
      .sort({ approvedAt: -1 })
      .lean();

    return NextResponse.json(
      { mushrooms },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("GET mushrooms error:", err);
    return NextResponse.json(
      { error: "Failed to fetch mushrooms" },
      { status: 500 }
    );
  }
}


export async function POST(req) {
  try {
    await connectDB();

    /* ---------- AUTH ---------- */
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    /* ---------- JSON BODY ---------- */
    const {
      latitude,
      longitude,
      imageUrl,
      publicId,
      photoDateTime,
      commonName,
      scientificName,
      ecologicalRole,
      texture,
      underside,
      fruitingSurface,
      stemPresence,
      commonUses,
    } = await req.json();

    /* ---------- VALIDATION ---------- */
    if (!latitude || !longitude || !imageUrl || !publicId) {
      return NextResponse.json(
        { error: "Latitude, longitude and image are required" },
        { status: 400 }
      );
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    /* ---------- CREATE DOCUMENT ---------- */
    const isAdmin = user.role === "admin";
    const mushroomData = {
      images: [{ url: imageUrl, publicId }],
      location: { latitude: lat, longitude: lng },
      submittedBy: user._id,
      status: isAdmin ? "approved" : "pending",
      ...(isAdmin && { approvedAt: new Date(), reviewedBy: user._id }),
    };


    if (commonName) mushroomData.commonName = commonName;
    if (scientificName) mushroomData.scientificName = scientificName;
    if (Array.isArray(ecologicalRole) && ecologicalRole.length)
      mushroomData.ecologicalRole = ecologicalRole;
    if (texture) mushroomData.texture = texture;
    if (underside) mushroomData.underside = underside;
    if (fruitingSurface) mushroomData.fruitingSurface = fruitingSurface;
    if (stemPresence) mushroomData.stemPresence = stemPresence;
    if (Array.isArray(commonUses) && commonUses.length)
      mushroomData.commonUses = commonUses;

    if (photoDateTime) {
      const d = new Date(photoDateTime);
      if (!isNaN(d.getTime())) mushroomData.photoDateTime = d;
    }

    await Mushroom.create(mushroomData);

    return NextResponse.json(
      { 
        message: isAdmin 
          ? "Mushroom published successfully" 
          : "Mushroom submitted successfully will be reviewed by an Admin" 
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST mushrooms error:", err);
    return NextResponse.json(
      { 
        error: "Failed to submit mushroom",
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.toString() : undefined
      },
      { status: 500 }
    );
  }
}
