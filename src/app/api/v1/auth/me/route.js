import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import cloudinary from "@/lib/cloudinary";
import User from "@/models/User";
import Mushroom from "@/models/Mushroom";
import PointLog from "@/models/PointLog";
import { bearerToken, json, readJson, requireMobileUser, userPayload } from "@/lib/mobileApi";

// GET /v1/auth/me — the signed-in user.
export async function GET(req) {
  const token = bearerToken(req);
  if (!token) {
    return json({ success: false, message: "No token provided" }, 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectDB();
    const user = await User.findById(decoded.id).select("-password");

    // The apps sign the user out on 401, which is what a ban or deletion needs.
    if (!user || user.isBanned || user.deletedAt) {
      return json({ success: false, message: "User not found" }, user ? 401 : 404);
    }

    return json({ success: true, user: userPayload(user) });
  } catch (error) {
    return json({ success: false, message: "Invalid token", error: error.message }, 401);
  }
}

// PATCH /v1/auth/me — set or remove the profile picture.
// Body: { dp: { url, public_id } } to set a custom picture, { dp: null } to remove it.
export async function PATCH(req) {
  const { user: authUser, response } = await requireMobileUser(req);
  if (response) return response;

  try {
    const body = await readJson(req);
    if (!("dp" in body)) {
      return json({ success: false, message: "Nothing to update" }, 400);
    }

    // Only pictures uploaded to our own Cloudinary account may be set as a dp —
    // otherwise any URL could be pinned to a profile.
    const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
    const { dp } = body;
    if (dp !== null && (typeof dp?.url !== "string" || !dp.url.startsWith(prefix) || !dp.public_id)) {
      return json({ success: false, message: "Invalid picture" }, 400);
    }

    const user = await User.findById(authUser._id);
    const previousUpload = user.dp?.public_id;

    user.dp = dp ? { url: dp.url, public_id: String(dp.public_id), source: "custom" } : { source: "none" };
    await user.save();

    // Best-effort cleanup of the picture being replaced; a leftover image is harmless.
    if (previousUpload && previousUpload !== user.dp.public_id) {
      cloudinary.uploader.destroy(previousUpload).catch(() => {});
    }

    return json({ success: true, user: userPayload(user) });
  } catch (error) {
    console.error("Profile update error:", error);
    return json({ success: false, message: "Server Error" }, 500);
  }
}

// DELETE /v1/auth/me — permanently delete the account and its data.
// Required by Google Play's account-deletion policy. `submittedBy` is required
// on Mushroom, so submissions are removed with the account rather than left
// pointing at a deleted user.
export async function DELETE(req) {
  const { user, response } = await requireMobileUser(req);
  if (response) return response;

  try {
    const userId = user._id;
    const mushrooms = await Mushroom.find({ submittedBy: userId }).select("images").lean();

    // A Cloudinary failure on one image must not block deleting the account's
    // own records, which is the part the user actually asked for.
    const publicIds = mushrooms.flatMap((m) => m.images?.map((i) => i.publicId).filter(Boolean) || []);
    if (user.dp?.public_id) publicIds.push(user.dp.public_id);
    await Promise.allSettled(publicIds.map((id) => cloudinary.uploader.destroy(id)));

    await Mushroom.deleteMany({ submittedBy: userId });
    await PointLog.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);
    return json({ success: true, message: "Account and associated data deleted" });
  } catch (error) {
    console.error("Account deletion error:", error);
    return json({ success: false, message: "Server Error" }, 500);
  }
}
