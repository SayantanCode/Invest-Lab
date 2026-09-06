// Ephemeral holding area between "requested an OTP" and "verified it" — a
// pending signup is never a real account. TTL-indexed on expiresAt so
// abandoned signups clean themselves up automatically; requesting a new code
// for the same email overwrites the previous doc outright (see
// app/api/auth/signup/request-otp/route.ts), invalidating the old code.

import { Schema, model, models } from "mongoose";

const PendingSignupSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
    resendCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
);
PendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingSignupModel =
  models.PendingSignup ?? model("PendingSignup", PendingSignupSchema, "pending_signups");
