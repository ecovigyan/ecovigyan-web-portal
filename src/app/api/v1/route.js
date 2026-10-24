import { NextResponse } from "next/server";

// Served at the root of api.ecovigyan.org, as the Express server did.
export function GET() {
  return NextResponse.json({
    message: "Eco Vigyan API is running",
    version: "1.0.0",
  });
}
