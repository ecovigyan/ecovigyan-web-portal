import { connectDB } from "@/lib/mongodb";
import Trail from "@/models/Trail";
import "@/models/User";
import { hasAdminAccess } from "@/lib/permissions";
import { json, readJson, requireMobileUser } from "@/lib/mobileApi";
import { ALLOWED_DIFFICULTIES, buildLocation, normalizePoint, withBothShapes } from "@/lib/trailGeo";

// GET /v1/trails — every trail, newest first. Public.
export async function GET() {
  try {
    await connectDB();
    const trails = await Trail.find({}).populate("user", "name username dp").sort({ createdAt: -1 }).lean();
    return json(trails);
  } catch (error) {
    console.error("Error fetching trails:", error);
    return json({ message: "Server Error" }, 500);
  }
}

// POST /v1/trails — create a trail. Admins only.
export async function POST(req) {
  const { user, response } = await requireMobileUser(req);
  if (response) return response;
  if (!hasAdminAccess(user)) {
    return json({ message: "Not authorized as an admin" }, 401);
  }

  try {
    const { name, location, mushrooms, difficulty, length } = await readJson(req);
    const stops = Array.isArray(mushrooms) ? mushrooms : [];

    if (stops.length < 2) {
      return json({ message: "A trail needs at least 2 stops" }, 400);
    }
    if (stops.some((m) => !normalizePoint(m?.location))) {
      return json({ message: "Every stop must have a valid { latitude, longitude } location" }, 400);
    }

    const parsedLength = Number.parseFloat(length);

    const trail = await Trail.create({
      name,
      user: user._id,
      difficulty: ALLOWED_DIFFICULTIES.includes(difficulty) ? difficulty : "Moderate",
      ...(Number.isFinite(parsedLength) ? { length: parsedLength } : {}),
      location: withBothShapes(buildLocation(location, stops)),
      mushrooms: stops,
    });

    return json(trail, 201);
  } catch (error) {
    console.error("Error creating trail:", error);
    return json({ message: "Server Error", error: error.message }, 500);
  }
}
