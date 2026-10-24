/**
 * Shared helpers for the mobile API (/api/v1, served publicly as
 * api.ecovigyan.org/v1).
 *
 * These routes replace the old standalone Express server. Installed app builds
 * depend on its exact responses, so the shapes here deliberately match it —
 * including the plain arrays and `{ success, message }` errors — rather than
 * the `{ error }` style the website routes use.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const json = (body, status = 200) => NextResponse.json(body, { status });

export const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const signMobileToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });

/** The user object every auth endpoint returns. */
export const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  dp: user.dp,
  role: user.role,
  points: user.points,
});

export const bearerToken = (req) => {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer") ? header.split(" ")[1] : null;
};

/**
 * Resolves the signed-in user from the Bearer token.
 *
 * Unlike the old Express middleware, banned and deleted accounts are refused:
 * before, a banned user kept full access until their 30-day token expired.
 *
 * @returns {Promise<{user: object|null, response: NextResponse|null}>}
 *   `response` is the 401 to return when there is no usable user.
 */
export async function requireMobileUser(req) {
  const token = bearerToken(req);
  if (!token) {
    return { user: null, response: json({ message: "Not authorized, no token" }, 401) };
  }

  try {
    await connectDB();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || user.isBanned || user.deletedAt) {
      return { user: null, response: json({ message: "Not authorized" }, 401) };
    }
    return { user, response: null };
  } catch {
    return { user: null, response: json({ message: "Not authorized" }, 401) };
  }
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
