import { OAuth2Client } from "google-auth-library";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { json, readJson, signMobileToken, userPayload } from "@/lib/mobileApi";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// The apps sign in natively, so the ID token's audience is whichever client
// the device used: web (Expo), Android or iOS.
const googleAudiences = () =>
  [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean);

export async function POST(req) {
  try {
    const { idToken } = await readJson(req);
    if (!idToken) {
      return json({ message: "ID token is required" }, 400);
    }

    const ticket = await client.verifyIdToken({ idToken, audience: googleAudiences() });
    const { email, name, picture } = ticket.getPayload();

    await connectDB();
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user?.isBanned) {
      return json(
        { success: false, message: "Your account has been suspended. Please contact support." },
        403
      );
    }

    if (!user) {
      const username = `${email.split("@")[0]}_${Math.random().toString(36).substring(7)}`;
      user = await User.create({
        name,
        email,
        username,
        authProvider: "google",
        dp: picture ? { url: picture, source: "google" } : undefined,
        isVerified: true,
      });
    } else {
      // Refresh the Google picture unless the user chose their own (or removed
      // it). Legacy records have no source; a public_id means an upload.
      user.lastLogin = new Date();
      const userChosePicture =
        user.dp?.source === "custom" || user.dp?.source === "none" || Boolean(user.dp?.public_id);
      if (picture && !userChosePicture && user.dp?.url !== picture) {
        user.dp = { url: picture, source: "google" };
      }
      await user.save();
    }

    return json({ success: true, token: signMobileToken(user._id), user: userPayload(user) });
  } catch (error) {
    console.error("Google auth error:", error);
    return json({ error: error.message }, 401);
  }
}
