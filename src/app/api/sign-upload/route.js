import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req) {
  // Only logged-in users can get a signature
  const { user, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
  }

  const { folder } = await req.json().catch(() => ({}));

  const timestamp = Math.round(Date.now() / 1000);

  // Build params to sign — must match exactly what the browser sends to Cloudinary
  const paramsToSign = { timestamp };
  if (folder) paramsToSign.folder = folder;

  // Sort alphabetically, join as key=value&key=value, append secret (no &)
  const stringToSign = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&") + process.env.CLOUDINARY_API_SECRET;

  const signature = crypto
    .createHash("sha256")
    .update(stringToSign)
    .digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
