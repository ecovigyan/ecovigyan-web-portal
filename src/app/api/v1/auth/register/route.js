import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { json, readJson, signMobileToken } from "@/lib/mobileApi";

export async function POST(req) {
  try {
    const { name, email, password, username } = await readJson(req);

    if (!name || !email || !password || !username) {
      return json({ success: false, message: "Please provide all required fields" }, 400);
    }

    await connectDB();

    const userExists = await User.findOne({
      $or: [{ email: String(email).toLowerCase() }, { username: String(username).toLowerCase() }],
    });
    if (userExists) {
      return json({ success: false, message: "User with this email or username already exists" }, 400);
    }

    const user = await User.create({
      name,
      email,
      username,
      password: await bcrypt.hash(password, 10),
      role: "user",
      points: 0,
      isVerified: false,
    });

    return json(
      {
        success: true,
        token: signMobileToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          points: user.points,
        },
      },
      201
    );
  } catch (error) {
    console.error("Registration error:", error);
    return json({ success: false, message: "Server Error", error: error.message }, 500);
  }
}
