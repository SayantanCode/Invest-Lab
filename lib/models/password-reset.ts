// Ephemeral holding area between "requested a password reset code" and
// "verified it" — same lifecycle as PendingSignupModel. TTL-indexed on
// expiresAt so abandoned resets clean themselves up automatically;
// requesting a new code for the same email overwrites the previous doc
// outright (see app/api/auth/forgot-password/request-otp/route.ts),
// invalidating the old code.

import { Schema, model, models } from "mongoose";

const PasswordResetSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
);
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetModel =
  models.PasswordReset ?? model("PasswordReset", PasswordResetSchema, "password_resets");
