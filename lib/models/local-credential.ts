// Permanent record for email+password sign-in — created only once an OTP is
// verified (see app/api/auth/signup/verify-otp/route.ts). `userId` points at
// a document in the adapter's native `users` collection (lib/server/mongodb.ts),
// not a Mongoose model — @auth/mongodb-adapter owns that collection's shape
// and manages it via the native driver for Google sign-ins, so a
// credentials-created user is inserted the same way to stay compatible.

import { Schema, model, models } from "mongoose";

// createdAt stays a plain ISO string, not Mongoose's Date-based `timestamps`
// option — same reasoning as lib/models/plan.ts, avoids colliding with this
// already-declared field of the same name. versionKey is still off.
const LocalCredentialSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ["pending", "verified"], default: "pending" },
    verificationExpiresAt: { type: Date, required: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const LocalCredentialModel =
  models.LocalCredential ?? model("LocalCredential", LocalCredentialSchema, "local_credentials");
