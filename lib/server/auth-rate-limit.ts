// Per-email throttle, shared by every "send this email an automated
// message" action (OTP requests, report emails) — same atomic-upsert
// pattern as lib/ai-rate-limit.ts. Protects the Brevo free-tier daily quota
// (shared across every kind of email this app sends) and blocks trivial
// spam, whether that's someone hammering another inbox with OTP requests or
// a buggy client looping on "email me a copy." Not per-IP: an email is the
// meaningful unit here since the whole point is "does this inbox actually
// want another message."

import connectToDatabase from "@/lib/server/mongoose";
import { Schema, model, models } from "mongoose";

const EmailUsageSchema = new Schema(
  {
    email: { type: String, required: true },
    date: { type: String, required: true },
    kind: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    lastRequestedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);
EmailUsageSchema.index({ email: 1, date: 1, kind: 1 }, { unique: true });

const EmailUsageModel = models.EmailUsage ?? model("EmailUsage", EmailUsageSchema, "email_usage");

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function checkAndConsumeQuota(
  email: string,
  kind: string,
  { maxPerDay, minSecondsBetween }: { maxPerDay: number; minSecondsBetween: number }
): Promise<{ allowed: boolean; reason?: "too-soon" | "daily-limit" }> {
  const date = todayUTC();
  const now = new Date();
  await connectToDatabase;

  const existing = await EmailUsageModel.findOne({ email, date, kind }).lean<{
    count: number;
    lastRequestedAt: Date;
  }>();

  if (existing) {
    const secondsSinceLast = (now.getTime() - new Date(existing.lastRequestedAt).getTime()) / 1000;
    if (secondsSinceLast < minSecondsBetween) return { allowed: false, reason: "too-soon" };
    if (existing.count >= maxPerDay) return { allowed: false, reason: "daily-limit" };
  }

  await EmailUsageModel.findOneAndUpdate(
    { email, date, kind },
    { $inc: { count: 1 }, $set: { lastRequestedAt: now } },
    { upsert: true }
  );

  return { allowed: true };
}

export async function checkAndConsumeOtpRequestQuota(
  email: string
): Promise<{ allowed: boolean; reason?: "too-soon" | "daily-limit" }> {
  return checkAndConsumeQuota(email, "otp", { maxPerDay: 5, minSecondsBetween: 60 });
}

// More generous than OTP — this is a legitimate self-service action a
// signed-in user might reasonably want a few times a day, not a one-off
// verification step. Still capped, since every send eats the same shared
// Brevo daily quota that OTP emails depend on.
export async function checkAndConsumeReportEmailQuota(
  email: string
): Promise<{ allowed: boolean; reason?: "too-soon" | "daily-limit" }> {
  return checkAndConsumeQuota(email, "report", { maxPerDay: 10, minSecondsBetween: 30 });
}
