import { connectDB } from "@/lib/mongodb";
import Trail from "@/models/Trail";
import "@/models/User";
import { hasAdminAccess } from "@/lib/permissions";
import { isValidId, json, readJson, requireMobileUser } from "@/lib/mobileApi";
import { ALLOWED_DIFFICULTIES, buildLocation, normalizePoint, withBothShapes } from "@/lib/trailGeo";

async function requireAdmin(req) {
  const { user, response } = await requireMobileUser(req);
  if (response) return response;
  if (!hasAdminAccess(user)) {
    return json({ message: "Not authorized as an admin" }, 401);
  }
  return null;
}

// GET /v1/trails/:id — public.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return json({ message: "Invalid trail id" }, 400);
    }

    await connectDB();
    const trail = await Trail.findById(id).populate("user", "name username dp").lean();
    if (!trail) {
      return json({ message: "Trail not found" }, 404);
    }
    return json(trail);
  } catch (error) {
    console.error("Error fetching trail:", error);
    return json({ message: "Server Error" }, 500);
  }
}

// PATCH /v1/trails/:id — partial update. Admins only.
//
// Only the fields present in the body are touched. Unlike create, an invalid
// value is rejected rather than silently defaulted — an explicit edit that
// quietly does something else is worse than an error.
export async function PATCH(req, { params }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return json({ message: "Invalid trail id" }, 400);
    }

    const { name, difficulty, length, location, mushrooms } = await readJson(req);
    const update = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return json({ message: "Name must be a non-empty string" }, 400);
      }
      if (name.trim().length > 50) {
        return json({ message: "Name must be 50 characters or fewer" }, 400);
      }
      update.name = name.trim();
    }

    if (difficulty !== undefined) {
      if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
        return json({ message: `Difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(", ")}` }, 400);
      }
      update.difficulty = difficulty;
    }

    if (length !== undefined) {
      const parsedLength = Number.parseFloat(length);
      if (!Number.isFinite(parsedLength) || parsedLength < 0) {
        return json({ message: "Length must be a non-negative number" }, 400);
      }
      update.length = parsedLength;
    }

    // Replacing the stops also replaces the derived trailhead and centre,
    // otherwise the start gate would keep measuring against the old route.
    if (mushrooms !== undefined) {
      if (!Array.isArray(mushrooms) || mushrooms.length < 2) {
        return json({ message: "A trail needs at least 2 stops" }, 400);
      }
      if (mushrooms.some((m) => !normalizePoint(m?.location))) {
        return json({ message: "Every stop must have a valid { latitude, longitude } location" }, 400);
      }
      update.mushrooms = mushrooms;
      update.location = withBothShapes(buildLocation(location, mushrooms));
    } else if (location !== undefined) {
      await connectDB();
      const existing = await Trail.findById(id).select("mushrooms").lean();
      if (!existing) {
        return json({ message: "Trail not found" }, 404);
      }
      update.location = withBothShapes(buildLocation(location, existing.mushrooms));
    }

    if (Object.keys(update).length === 0) {
      return json(
        { message: "No updatable fields provided (name, difficulty, length, location, mushrooms)" },
        400
      );
    }

    await connectDB();
    const trail = await Trail.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate("user", "name username dp")
      .lean();

    if (!trail) {
      return json({ message: "Trail not found" }, 404);
    }
    return json(trail);
  } catch (error) {
    console.error("Error updating trail:", error);
    if (error.name === "ValidationError") {
      return json({ message: error.message }, 400);
    }
    return json({ message: "Server Error", error: error.message }, 500);
  }
}

// DELETE /v1/trails/:id — admins only.
export async function DELETE(req, { params }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return json({ message: "Invalid trail id" }, 400);
    }

    await connectDB();
    const trail = await Trail.findById(id);
    if (!trail) {
      return json({ message: "Trail not found" }, 404);
    }
    await trail.deleteOne();
    return json({ message: "Trail removed" });
  } catch (error) {
    console.error("Error deleting trail:", error);
    return json({ message: "Server Error" }, 500);
  }
}
