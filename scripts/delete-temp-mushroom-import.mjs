import { MongoClient } from "mongodb";

const rawUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "eco-vigyan";

function getArgValue(flag) {
  const exact = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (exact) {
    return exact.slice(flag.length + 1);
  }

  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return null;
}

const batchTag = getArgValue("--batch-tag");
const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

if (!batchTag) {
  throw new Error("Missing required --batch-tag argument.");
}

if (!rawUri) {
  throw new Error("MONGODB_URI is not defined.");
}

async function run() {
  const client = new MongoClient(rawUri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const mushroomsCollection = db.collection("mushrooms");
    const query = {
      adminNotes: { $regex: `TEMP_BULK_IMPORT:${batchTag}` },
    };

    const matchingCount = await mushroomsCollection.countDocuments(query);

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            dbName,
            batchTag,
            matchingCount,
          },
          null,
          2
        )
      );
      return;
    }

    const result = await mushroomsCollection.deleteMany(query);

    console.log(
      JSON.stringify(
        {
          dbName,
          batchTag,
          matchingCount,
          deletedCount: result.deletedCount,
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
  console.error("Temporary mushroom cleanup failed:", error);
  process.exit(1);
});
