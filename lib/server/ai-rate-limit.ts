// Two-tier daily quota for the AI assistant: a per-user cap (stops one
// person hogging it) and a global cap (stops the whole app blowing through
// the shared Gemini free-tier quota at once).

import connectToDatabase from "@/lib/server/mongoose";
import { GlobalUsageModel, UserUsageModel } from "@/lib/models/ai-usage";

const PER_USER_LIMIT = Number(process.env.AI_DAILY_LIMIT_PER_USER ?? 15);
const GLOBAL_LIMIT = Number(process.env.AI_DAILY_LIMIT_GLOBAL ?? 1200);

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Atomically records one use and reports whether it's within both caps — both counters increment regardless of the outcome, since a read-then-conditional-increment wouldn't be atomic anyway. */
export async function checkAndConsumeQuota(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = todayUTC();
  await connectToDatabase;

  const [userDoc, globalDoc] = await Promise.all([
    UserUsageModel.findOneAndUpdate(
      { userId, date },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: "after" }
    ).lean<{ count: number }>(),
    GlobalUsageModel.findOneAndUpdate(
      { date },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: "after" }
    ).lean<{ count: number }>(),
  ]);

  const userCount = userDoc?.count ?? 1;
  const globalCount = globalDoc?.count ?? 1;
  const allowed = userCount <= PER_USER_LIMIT && globalCount <= GLOBAL_LIMIT;

  return { allowed, remaining: Math.max(0, PER_USER_LIMIT - userCount), limit: PER_USER_LIMIT };
}

/** Read-only look at today's remaining quota, without consuming a use — for the UI to show "N left today" on load and after each exchange. */
export async function peekQuota(userId: string): Promise<{ remaining: number; limit: number }> {
  const date = todayUTC();
  await connectToDatabase;

  const userDoc = await UserUsageModel.findOne({ userId, date }).lean<{ count: number }>();
  const userCount = userDoc?.count ?? 0;

  return { remaining: Math.max(0, PER_USER_LIMIT - userCount), limit: PER_USER_LIMIT };
}
