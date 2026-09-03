import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set — add it to .env.local");
  }
  const client = new MongoClient(uri);
  return client.connect();
}

// Cache the connection promise on the global object in dev so Next.js's
// module-reloading on every request doesn't open a fresh connection each time.
const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "development"
    ? (global._mongoClientPromise ??= createClientPromise())
    : createClientPromise();

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db();
}
