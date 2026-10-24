// Read-only export of mushroom submissions in an IST date range.
// Usage: node --env-file=.env scripts/export-mushroom-submissions.mjs --from 2026-10-06 --to 2026-10-08 [--out file.tsv]
import { writeFileSync } from "node:fs";
import { MongoClient } from "mongodb";

function getArgValue(flagName) {
  const prefix = `${flagName}=`;
  const directMatch = process.argv.find((arg) => arg.startsWith(prefix));
  if (directMatch) return directMatch.slice(prefix.length);
  const flagIndex = process.argv.indexOf(flagName);
  return flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "eco-vigyan";
const from = getArgValue("--from");
const to = getArgValue("--to");
const outPath = getArgValue("--out");

if (!uri || !from || !to) {
  console.error("MONGODB_URI, --from and --to (YYYY-MM-DD, inclusive, IST) are required");
  process.exit(1);
}

// IST day boundaries: start of --from through end of --to.
const start = new Date(`${from}T00:00:00+05:30`);
const end = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000);

const formatIst = (date) =>
  date
    ? new Date(date).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }).replace(",", "")
    : "";

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(dbName);

  const docs = await db
    .collection("mushrooms")
    .find({ createdAt: { $gte: start, $lt: end } })
    .sort({ createdAt: 1 })
    .toArray();

  const userIds = [...new Set(docs.map((d) => d.submittedBy).filter(Boolean).map(String))];
  const users = await db
    .collection("users")
    .find({ _id: { $in: docs.map((d) => d.submittedBy).filter(Boolean) } }, { projection: { name: 1 } })
    .toArray();
  const userNames = new Map(users.map((u) => [String(u._id), u.name || ""]));

  const maxImages = Math.max(1, ...docs.map((d) => d.images?.length || 0));
  const header = [
    "Submitted at (IST)",
    "Photo taken at (IST)",
    "Latitude",
    "Longitude",
    "Common name",
    "Scientific name",
    "Status",
    "Capture method",
    "Submitted by",
    ...Array.from({ length: maxImages }, (_, i) => `Image ${i + 1}`),
    "Google Maps",
    "ID",
  ];

  const clean = (value) => String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
  const rows = docs.map((d) => {
    const lat = d.location?.latitude;
    const lng = d.location?.longitude;
    const images = d.images || [];
    return [
      formatIst(d.createdAt),
      formatIst(d.photoDateTime),
      lat ?? "",
      lng ?? "",
      d.commonName,
      d.scientificName,
      d.status,
      d.captureMethod,
      userNames.get(String(d.submittedBy)),
      ...Array.from({ length: maxImages }, (_, i) => images[i]?.url || ""),
      lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : "",
      String(d._id),
    ].map(clean);
  });

  const tsv = [header, ...rows].map((r) => r.join("\t")).join("\n");
  if (outPath) writeFileSync(outPath, tsv);
  else process.stdout.write(tsv + "\n");

  const perDay = {};
  for (const d of docs) {
    const day = new Date(d.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    perDay[day] = (perDay[day] || 0) + 1;
  }
  console.error(`Rows: ${docs.length} from ${userIds.length} users`, perDay);
} finally {
  await client.close();
}
