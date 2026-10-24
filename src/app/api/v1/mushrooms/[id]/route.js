import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import "@/models/User";
import { isValidId, json } from "@/lib/mobileApi";

// GET /v1/mushrooms/:id
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return json({ message: "Mushroom not found" }, 404);
    }

    await connectDB();
    const mushroom = await Mushroom.findById(id).populate("submittedBy", "name username dp").lean();
    if (!mushroom) {
      return json({ message: "Mushroom not found" }, 404);
    }

    return json(mushroom);
  } catch (error) {
    console.error("Error fetching mushroom:", error);
    return json({ message: "Server Error" }, 500);
  }
}
