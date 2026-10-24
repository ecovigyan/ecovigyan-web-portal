import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { json, readJson, signMobileToken, userPayload } from "@/lib/mobileApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const { email, password } = await readJson(req);

    if (!email || !password) {
      return json({ success: false, message: "Email/username and password are required" }, 400);
    }

    await connectDB();

    // The field is called "email" but accepts a username too.
    const input = String(email).trim().toLowerCase();
    const query = EMAIL_RE.test(input) ? { email: input } : { username: input };
    const user = await User.findOne(query).select("+password");

    if (!user || user.deletedAt) {
      return json({ success: false, message: "Invalid credentials" }, 401);
    }

    if (user.isBanned) {
      return json(
        { success: false, message: "Your account has been suspended. Please contact support." },
        403
      );
    }

    if (!user.password) {
      return json(
        { success: false, message: "This account uses Google sign-in. Please continue with Google." },
        401
      );
    }

    // A few early accounts still hold plain-text passwords. They are checked
    // directly once and re-saved, which hashes them (see the User model).
    const hasBcryptPassword = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
    const isMatch = hasBcryptPassword
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!isMatch) {
      return json({ success: false, message: "Invalid credentials" }, 401);
    }

    if (!hasBcryptPassword) {
      user.password = password;
    }
    user.lastLogin = new Date();
    await user.save();

    return json({ success: true, token: signMobileToken(user._id), user: userPayload(user) });
  } catch (error) {
    console.error("Login error:", error);
    return json({ success: false, message: "Server Error", error: error.message }, 500);
  }
}
