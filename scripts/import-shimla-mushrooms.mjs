import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";

function getArgValue(flagName) {
  const prefix = `${flagName}=`;
  const directMatch = process.argv.find((arg) => arg.startsWith(prefix));
  if (directMatch) {
    return directMatch.slice(prefix.length);
  }

  const flagIndex = process.argv.indexOf(flagName);
  if (flagIndex >= 0) {
    return process.argv[flagIndex + 1];
  }

  return undefined;
}

const rawUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "eco-vigyan";
const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputFileArg = getArgValue("--file");
const defaultFileName = "shimla-mushroom-coordinates.tsv";
const dataPath = inputFileArg
  ? isAbsolute(inputFileArg)
    ? inputFileArg
    : resolve(process.cwd(), inputFileArg)
  : join(__dirname, defaultFileName);
const sourceLabel = getArgValue("--source-label") || "Shimla";

function sanitizeCoordinate(raw, type) {
  const original = String(raw ?? "").trim();
  let cleaned = original.replace(/[^\d.\-\s]/g, "").replace(/\s+/g, "");
  const corrections = [];

  if (cleaned !== original) {
    corrections.push(`normalized:${original}->${cleaned}`);
  }

  if (!cleaned) {
    return { value: NaN, cleaned, corrections };
  }

  let value = Number(cleaned);

  if (!Number.isFinite(value)) {
    return { value: NaN, cleaned, corrections };
  }

  const maxAbs = type === "latitude" ? 90 : 180;

  if (Math.abs(value) > maxAbs) {
    const sign = cleaned.startsWith("-") ? "-" : "";
    const digitsOnly = cleaned.replace(/[^\d]/g, "");
    const integerPart = cleaned.split(".")[0].replace(/[^\d-]/g, "");
    const normalizedIntegerPart = integerPart.startsWith("-")
      ? integerPart.slice(1)
      : integerPart;

    if (!cleaned.includes(".") && digitsOnly.length >= 7) {
      const reconstructed = Number(`${sign}${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2)}`);
      if (Number.isFinite(reconstructed) && Math.abs(reconstructed) <= maxAbs) {
        corrections.push(`decimal-inserted:${cleaned}->${reconstructed}`);
        value = reconstructed;
      }
    } else if (
      cleaned.includes(".") &&
      normalizedIntegerPart.length === 3 &&
      Number(normalizedIntegerPart.slice(0, 2)) <= maxAbs
    ) {
      const fractional = cleaned.split(".")[1] || "";
      const reconstructed = Number(
        `${sign}${normalizedIntegerPart.slice(0, 2)}.${fractional}`
      );
      if (Number.isFinite(reconstructed) && Math.abs(reconstructed) <= maxAbs) {
        corrections.push(`trimmed-leading-digit:${cleaned}->${reconstructed}`);
        value = reconstructed;
      }
    }
  }

  return { value, cleaned, corrections };
}

function parseRows(rawTable) {
  const lines = rawTable
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  const skipped = [];

  for (const line of lines) {
    if (/^sr\.?no/i.test(line)) {
      continue;
    }

    const tabParts = line.split(/\t+/).map((part) => part.trim());
    const parts =
      tabParts.length >= 4 ? tabParts : line.split(/\s{2,}/).map((part) => part.trim());

    if (parts.length < 4) {
      skipped.push({ line, reason: "Could not split into 4 columns" });
      continue;
    }

    const [srNoRaw, latitudeRaw, longitudeRaw, ...districtParts] = parts;
    const district = districtParts.join(" ").trim();
    const latitude = sanitizeCoordinate(latitudeRaw, "latitude");
    const longitude = sanitizeCoordinate(longitudeRaw, "longitude");

    if (!district) {
      skipped.push({ line, reason: "Missing district" });
      continue;
    }

    if (!Number.isFinite(latitude.value) || Math.abs(latitude.value) > 90) {
      skipped.push({
        line,
        reason: `Invalid latitude: ${latitudeRaw}`,
      });
      continue;
    }

    if (!Number.isFinite(longitude.value) || Math.abs(longitude.value) > 180) {
      skipped.push({
        line,
        reason: `Invalid longitude: ${longitudeRaw}`,
      });
      continue;
    }

    parsed.push({
      srNo: srNoRaw,
      district,
      latitudeRaw,
      longitudeRaw,
      latitude: latitude.value,
      longitude: longitude.value,
      corrections: [...latitude.corrections, ...longitude.corrections],
      sourceLine: line,
    });
  }

  return { parsed, skipped };
}

async function ensureSystemUser(usersCollection) {
  const existing = await usersCollection.findOne({ email: "system@ecovigyan.org" });
  if (existing?._id) {
    return existing._id;
  }

  const now = new Date();
  const userDoc = {
    name: "System Import",
    username: "system",
    email: "system@ecovigyan.org",
    role: "admin",
    authProvider: "credentials",
    bio: "",
    points: 0,
    isVerified: true,
    isBanned: false,
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await usersCollection.insertOne(userDoc);
  return insertResult.insertedId;
}

function buildDocuments(rows, systemUserId, now) {
  return rows.map((row) => ({
    commonName: `${row.district} Observation ${row.srNo}`,
    description: `Imported coordinate-only observation for ${row.district}.`,
    adminNotes: `${sourceLabel} import row ${row.srNo}; source lat/lng: ${row.latitudeRaw}, ${row.longitudeRaw}`,
    images: [],
    location: {
      latitude: row.latitude,
      longitude: row.longitude,
    },
    submittedBy: new ObjectId(systemUserId),
    ecologicalRole: [],
    commonUses: [],
    status: "approved",
    reviewedBy: new ObjectId(systemUserId),
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  }));
}

async function run() {
  const rawTable = readFileSync(dataPath, "utf8");
  const { parsed, skipped } = parseRows(rawTable);
  const correctedRows = parsed.filter((row) => row.corrections.length > 0);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          sourceLabel,
          dataPath,
          parsedCount: parsed.length,
          skippedCount: skipped.length,
          correctedCount: correctedRows.length,
          skippedPreview: skipped.slice(0, 20),
          correctedPreview: correctedRows.slice(0, 20).map((row) => ({
            srNo: row.srNo,
            district: row.district,
            corrections: row.corrections,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  if (!rawUri) {
    throw new Error("MONGODB_URI is not defined.");
  }

  const client = new MongoClient(rawUri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const usersCollection = db.collection("users");
    const mushroomsCollection = db.collection("mushrooms");

    const systemUserId = await ensureSystemUser(usersCollection);
    const now = new Date();
    const documents = buildDocuments(parsed, systemUserId, now);

    const result = documents.length
      ? await mushroomsCollection.insertMany(documents, { ordered: true })
      : { insertedCount: 0, insertedIds: {} };

    console.log(
      JSON.stringify(
        {
          insertedCount: result.insertedCount,
          skippedCount: skipped.length,
          correctedCount: correctedRows.length,
          sourceLabel,
          dataPath,
          dbName,
          firstInsertedId: result.insertedIds[0] || null,
          skippedPreview: skipped.slice(0, 20),
          correctedPreview: correctedRows.slice(0, 20).map((row) => ({
            srNo: row.srNo,
            district: row.district,
            corrections: row.corrections,
          })),
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error(`${sourceLabel} import failed:`, error);
  process.exit(1);
});
