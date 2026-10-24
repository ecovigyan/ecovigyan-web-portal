import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import User from "@/models/User";
import PointLog from "@/models/PointLog";
import { hasAdminAccess, isSuperAdmin } from "@/lib/permissions";
import { json, readJson, requireMobileUser } from "@/lib/mobileApi";

const POINTS_PER_SUBMISSION = 10;

// GET /v1/mushrooms — every approved mushroom, trimmed for the map.
export async function GET() {
  try {
    await connectDB();
    const mushrooms = await Mushroom.find({ status: "approved" })
      .select(
        "commonName scientificName location images status thumbnail submittedBy ecologicalRole createdAt photoDateTime texture underside fruitingSurface stemPresence commonUses"
      )
      .populate("submittedBy", "name username dp")
      .lean();

    return json(mushrooms);
  } catch (error) {
    console.error("Error fetching mushrooms:", error);
    return json({ message: "Server Error" }, 500);
  }
}

// POST /v1/mushrooms — submit a mushroom.
export async function POST(req) {
  const { user, response } = await requireMobileUser(req);
  if (response) return response;

  try {
    const {
      commonName,
      scientificName,
      latitude,
      longitude,
      imageUrl,
      publicId,
      photoDateTime,
      ecologicalRole,
      texture,
      underside,
      fruitingSurface,
      stemPresence,
      commonUses,
      captureMethod,
    } = await readJson(req);

    // Same rule as the website. Current app builds don't send captureMethod,
    // so it is only enforced once an app version starts reporting it.
    if (captureMethod && !["camera", "gallery"].includes(captureMethod)) {
      return json({ message: "Invalid captureMethod" }, 400);
    }
    if (captureMethod === "gallery" && !isSuperAdmin(user)) {
      return json(
        { message: "Gallery uploads are restricted to super admins. Please capture a live photo." },
        403
      );
    }

    const isAdmin = hasAdminAccess(user);

    const savedMushroom = await Mushroom.create({
      commonName,
      scientificName,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      images: [{ url: imageUrl, publicId }],
      thumbnail: imageUrl,
      captureMethod: captureMethod || "unknown",
      status: isAdmin ? "approved" : "pending",
      ...(isAdmin && { approvedAt: new Date(), reviewedBy: user._id }),
      ecologicalRole,
      texture,
      underside,
      fruitingSurface,
      stemPresence,
      commonUses,
      photoDateTime,
      submittedBy: user._id,
    });

    // Award submission points and keep an audit trail.
    await User.findByIdAndUpdate(user._id, { $inc: { points: POINTS_PER_SUBMISSION } });
    await PointLog.create({
      user: user._id,
      action: "MUSHROOM_SUBMITTED",
      points: POINTS_PER_SUBMISSION,
      referenceId: savedMushroom._id,
    });

    return json(savedMushroom, 201);
  } catch (error) {
    console.error("Error creating mushroom:", error);
    return json({ message: "Server Error", error: error.message }, 500);
  }
}
