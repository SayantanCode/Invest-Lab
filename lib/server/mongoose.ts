import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

declare global {
  var _mongooseConnPromise: Promise<typeof mongoose> | undefined;
}

function createConnectPromise(): Promise<typeof mongoose> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set — add it to .env.local");
  }
  return mongoose.connect(uri);
}

// Cached the same way lib/mongodb.ts caches its native-driver connection
// (kept separately for lib/auth.ts, whose MongoDBAdapter needs the native
// driver, not Mongoose) — avoids opening a fresh connection on every
// request during Next.js's module-reloading in dev.
const connectPromise: Promise<typeof mongoose> =
  process.env.NODE_ENV === "development"
    ? (global._mongooseConnPromise ??= createConnectPromise())
    : createConnectPromise();

export default connectPromise;
