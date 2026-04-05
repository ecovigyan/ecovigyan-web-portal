import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Mushroom from "@/models/Mushroom";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/auth";

// Helper function to convert Google Drive sharing link to direct image URL
function convertGoogleDriveLink(driveLink) {
  if (!driveLink || typeof driveLink !== "string") return null;

  const trimmed = driveLink.trim();

  // Reject non-URL values (e.g. "Mushroom visual | 253 sample")
  if (!trimmed.startsWith("http")) return null;

  // If it's already a direct image URL, return as is
  if (trimmed.includes("drive.google.com/uc?") || trimmed.includes("lh3.googleusercontent.com")) {
    return trimmed;
  }

  // Fix dash-format URLs stored with slashes replaced by dashes
  // e.g. "https:--drive.google.com-file-d-FILE_ID-view?usp=sharing"
  const dashMatch = trimmed.match(/file-d-([a-zA-Z0-9_-]{25,})/);
  if (dashMatch) {
    return `https://drive.google.com/uc?export=view&id=${dashMatch[1]}`;
  }

  // Extract file ID from standard Google Drive link formats
  let fileId = null;

  // Format: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) fileId = fileMatch[1];

  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) fileId = openMatch[1];

  if (fileId) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  // Return null for anything that doesn't resolve to a usable image URL
  return null;
}

export async function POST(req) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const { user: admin, error } = await getAuthenticatedUser();
    if (!admin) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= PARSE EXCEL ================= */
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Excel or CSV file is required" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamically import xlsx using named imports
    const { read, utils } = await import("xlsx");

    // Parse Excel or CSV file
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const workbook = read(buffer, { type: "buffer", raw: isCsv });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get raw data to check column structure
    const rawData = utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty or has no data" },
        { status: 400 }
      );
    }

    // Get headers from first row
    const headers = rawData[0] || [];
    console.log("Excel headers:", headers);
    
    // Try to find column indices by name or position
    const findColumnIndex = (possibleNames, defaultIndex = null) => {
      // First try to find by name (case-insensitive)
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || "").toLowerCase().trim();
        for (const name of possibleNames) {
          if (header === name.toLowerCase() || header.includes(name.toLowerCase())) {
            return i;
          }
        }
      }
      // If not found by name, use default index (for files without headers or with different names)
      return defaultIndex;
    };

    // Template column order:
    // Photo(0), Latitude(1), Longitude(2), Common Name(3), Scientific Name(4),
    // Stem Presence(5), Underside(6), Texture(7), Ecological Role(8), Common Uses(9)
    //
    // findColumnIndex searches headers by name first; falls back to default position
    // only when the header row has no recognisable match.
    const photoIndex          = findColumnIndex(["photo", "image", "link", "link to photo", "google drive", "photo/image", "photo/image link"], 0);
    const latIndex            = findColumnIndex(["latitude", "lat"], 1);
    const lngIndex            = findColumnIndex(["longitude", "long", "lng"], 2);
    const nameIndex           = findColumnIndex(["common name", "name", "mushroom name", "species name", "fungus name", "species"], 3);
    const scientificNameIndex = findColumnIndex(["scientific name", "scientific", "latin name", "binomial", "species (latin)"], 4);
    // "location" / "place" column (old template) — detect so it doesn't shift defaults, but don't store it
    findColumnIndex(["location", "place", "place name"], null);
    const stemIndex           = findColumnIndex(["stem", "stem presence"], 5);
    const bottomIndex         = findColumnIndex(["bottom", "underside", "bottom/underside"], 6);
    const textureIndex        = findColumnIndex(["texture"], 7);
    const roleIndex           = findColumnIndex(["ecological role", "role", "ecology", "fungus type"], 8);
    const useIndex            = findColumnIndex(["common uses", "use", "uses"], 9);

    console.log("Column indices:", { photoIndex, latIndex, lngIndex, nameIndex, scientificNameIndex, stemIndex, bottomIndex, textureIndex, roleIndex, useIndex });

    // Convert raw data to objects using column indices
    const data = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      const rowObj = {};
      if (photoIndex !== null && row[photoIndex] !== undefined) rowObj.imageLink = String(row[photoIndex] || "").trim();
      if (latIndex !== null && row[latIndex] !== undefined) rowObj.latitude = String(row[latIndex] || "").trim();
      if (lngIndex !== null && row[lngIndex] !== undefined) rowObj.longitude = String(row[lngIndex] || "").trim();
      if (nameIndex !== null && row[nameIndex] !== undefined) rowObj.name = String(row[nameIndex] || "").trim();
      if (scientificNameIndex !== null && row[scientificNameIndex] !== undefined) rowObj.scientificName = String(row[scientificNameIndex] || "").trim();
      if (stemIndex !== null && row[stemIndex] !== undefined) rowObj.stem = String(row[stemIndex] || "").trim();
      if (bottomIndex !== null && row[bottomIndex] !== undefined) rowObj.bottom = String(row[bottomIndex] || "").trim();
      if (textureIndex !== null && row[textureIndex] !== undefined) rowObj.texture = String(row[textureIndex] || "").trim();
      if (roleIndex !== null && row[roleIndex] !== undefined) rowObj.role = String(row[roleIndex] || "").trim();
      if (useIndex !== null && row[useIndex] !== undefined) rowObj.use = String(row[useIndex] || "").trim();
      
      data.push(rowObj);
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in Excel file" },
        { status: 400 }
      );
    }

    /* ================= PROCESS DATA ================= */
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Get or create a system user for bulk imports
    let systemUser = await User.findOne({ email: "system@ecovigyan.org" });
    if (!systemUser) {
      const hashedPassword = await bcrypt.hash("system-import-password", 10);
      systemUser = await User.create({
        name: "System Import",
        username: "system",
        email: "system@ecovigyan.org",
        password: hashedPassword,
        role: "admin",
      });
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Extract data from row object (already mapped by column index)
        const imageLink = row.imageLink || "";
        const latStr = row.latitude || "";
        const lngStr = row.longitude || "";
        const name = row.name || "";
        const stem = row.stem || "";
        const bottom = row.bottom || "";
        const texture = row.texture || "";
        const role = row.role || "";
        const use = row.use || "";

        // Validate required fields (only photo, latitude, longitude are required)
        if (!imageLink || !latStr || !lngStr) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Missing required fields. Found - Photo: "${imageLink ? 'Yes' : 'No'}", Lat: "${latStr || 'No'}", Lng: "${lngStr || 'No'}"`);
          continue;
        }

        // Parse coordinates
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lngStr);

        if (isNaN(latitude) || isNaN(longitude)) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Invalid coordinates - Lat: "${latStr}", Lng: "${lngStr}"`);
          continue;
        }

        // Validate coordinate ranges with detailed error messages
        if (latitude < -90 || latitude > 90) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Latitude out of range (must be -90 to 90). Found: ${latitude}`);
          continue;
        }

        if (longitude < -180 || longitude > 180) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Longitude out of range (must be -180 to 180). Found: ${longitude}`);
          continue;
        }

        // Convert Google Drive link to direct image URL
        const imageUrl = convertGoogleDriveLink(imageLink.trim());
        
        if (!imageUrl) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Invalid image link`);
          continue;
        }

        // Helper function to normalize enum values
        const normalizeStemPresence = (value) => {
          if (!value) return null;
          const normalized = value.toLowerCase().trim();
          if (normalized.includes("has-stem") || normalized.includes("stem") || normalized === "yes" || normalized === "y") {
            return "has-stem";
          }
          if (normalized.includes("no-stem") || normalized.includes("no stem") || normalized === "no" || normalized === "n") {
            return "has-no-stem";
          }
          return null;
        };

        const normalizeEcologicalRole = (value) => {
          if (!value) return null;
          const normalized = value.toLowerCase().trim();
          if (normalized.includes("decomposer")) return "decomposer";
          if (normalized.includes("symbiont") || normalized.includes("symbiotic")) return "symbiont";
          if (normalized.includes("parasite") || normalized.includes("parasitic")) return "parasite";
          return null;
        };

        const normalizeCommonUses = (value) => {
          if (!value) return [];
          const normalized = value.toLowerCase().trim();
          const uses = [];
          if (normalized.includes("edible")) uses.push("edible");
          if (normalized.includes("inedible")) uses.push("inedible");
          if (normalized.includes("poisonous") || normalized.includes("poison")) uses.push("poisonous");
          if (normalized.includes("medicinal") || normalized.includes("medicine")) uses.push("medicinal");
          if (normalized.includes("hallucinogenic") || normalized.includes("hallucinogen")) uses.push("hallucinogenic");
          if (normalized.includes("other")) uses.push("other-uses");
          if (normalized.includes("mysterious") || normalized.includes("unknown")) uses.push("mysterious");
          return uses;
        };

        // Create mushroom entry
        const mushroomData = {
          images: [
            {
              url: imageUrl,
              publicId: `imported-${Date.now()}-${i}`, // Placeholder publicId for imported images
              originalDriveLink: imageLink.trim(), // Store original Google Drive link for system imports
            },
          ],
          location: {
            latitude,
            longitude,
          },
          submittedBy: systemUser._id,
          status: "approved", // Auto-approve imported mushrooms
          approvedAt: new Date(),
          reviewedBy: admin._id,
        };

        // Add optional fields if provided
        if (name && name.trim()) {
          mushroomData.commonName = name.trim();
        }

        if (row.scientificName && row.scientificName.trim()) {
          mushroomData.scientificName = row.scientificName.trim();
        }

        const normalizedStem = normalizeStemPresence(stem);
        if (normalizedStem) {
          mushroomData.stemPresence = normalizedStem;
        }

        if (bottom && bottom.trim()) {
          const normalizedBottom = bottom.toLowerCase().trim();
          // Check if it matches any valid enum value
          const validUndersides = [
            "gills", "pores", "teeth",
            "ball-with-no-distinctive-bottom",
            "cup-with-no-distinctive-bottom",
            "star-with-no-distinctive-bottom",
            "jelly-with-no-distinctive-bottom",
            "sponge-with-no-distinctive-bottom"
          ];
          if (validUndersides.includes(normalizedBottom)) {
            mushroomData.underside = normalizedBottom;
          } else if (normalizedBottom.includes("gill")) {
            mushroomData.underside = "gills";
          } else if (normalizedBottom.includes("pore")) {
            mushroomData.underside = "pores";
          } else if (normalizedBottom.includes("teeth")) {
            mushroomData.underside = "teeth";
          }
        }

        if (texture && texture.trim()) {
          const normalizedTexture = texture.toLowerCase().trim();
          const validTextures = ["soft-to-touch", "hard-to-touch", "jelly-like", "leathery"];
          if (validTextures.includes(normalizedTexture)) {
            mushroomData.texture = normalizedTexture;
          } else if (normalizedTexture.includes("soft")) {
            mushroomData.texture = "soft-to-touch";
          } else if (normalizedTexture.includes("hard")) {
            mushroomData.texture = "hard-to-touch";
          } else if (normalizedTexture.includes("jelly")) {
            mushroomData.texture = "jelly-like";
          } else if (normalizedTexture.includes("leather")) {
            mushroomData.texture = "leathery";
          }
        }

        const normalizedRole = normalizeEcologicalRole(role);
        if (normalizedRole) {
          mushroomData.ecologicalRole = normalizedRole;
        }

        const normalizedUses = normalizeCommonUses(use);
        if (normalizedUses.length > 0) {
          mushroomData.commonUses = normalizedUses;
        }

        await Mushroom.create(mushroomData);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json(
      {
        message: `Import completed: ${results.success} successful, ${results.failed} failed`,
        results,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import mushrooms" },
      { status: 500 }
    );
  }
}

