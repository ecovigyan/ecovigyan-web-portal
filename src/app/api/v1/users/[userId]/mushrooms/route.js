import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import "@/models/User";
import { isValidId, json } from "@/lib/mobileApi";

// GET /v1/users/:userId/mushrooms — a user's submissions, newest first.
// Includes pending and rejected ones: the apps show them on the user's own
// profile with their status.
export async function GET(req, { params }) {
  try {
    const { userId } = await params;
    if (!isValidId(userId)) {
      return json([]);
    }

    await connectDB();
    const mushrooms = await Mushroom.find({ submittedBy: userId })
      .select(
        "commonName scientificName location images status thumbnail submittedBy ecologicalRole commonUses createdAt photoDateTime"
      )
      .sort({ createdAt: -1 })
      .populate("submittedBy", "name username dp")
      .lean();

    return json(mushrooms);
  } catch (error) {
    console.error("Error fetching user mushrooms:", error);
    return json({ message: "Server Error" }, 500);
  }
}
