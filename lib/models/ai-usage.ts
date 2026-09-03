// Two-tier daily quota for the AI assistant (lib/server/ai-rate-limit.ts) — a
// per-user doc keyed {userId, date} and a single global doc keyed {date}.

import { Schema, model, models } from "mongoose";

const UserUsageSchema = new Schema(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
);
UserUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserUsageModel = models.AiUserUsage ?? model("AiUserUsage", UserUsageSchema, "ai_usage");

const GlobalUsageSchema = new Schema(
  {
    date: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const GlobalUsageModel = models.AiGlobalUsage ?? model("AiGlobalUsage", GlobalUsageSchema, "ai_usage_global");
