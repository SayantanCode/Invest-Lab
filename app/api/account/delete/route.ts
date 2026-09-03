import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { auth } from "@/lib/server/auth";
import { getDb } from "@/lib/server/mongodb";
import connectToDatabase from "@/lib/server/mongoose";
import { PlanModel } from "@/lib/models/plan";
import { ActivityModel } from "@/lib/models/activity";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { UserUsageModel } from "@/lib/models/ai-usage";

/**
 * Removes only the calling user's own data — never touches
 * ai_usage_global (the shared daily counter). Mirrors exactly what
 * @auth/mongodb-adapter's own internal deleteUser does for `accounts` and
 * `users` (verified against its source: userId is stored there as a native
 * ObjectId, not a string) — same convention, plus this app's own
 * collections it doesn't know about.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  if (!ObjectId.isValid(userId)) return NextResponse.json({ error: "Invalid session" }, { status: 400 });

  await connectToDatabase;
  await Promise.all([
    PlanModel.deleteMany({ userId }),
    ActivityModel.deleteMany({ userId }),
    LocalCredentialModel.deleteMany({ userId }),
    UserUsageModel.deleteMany({ userId }),
  ]);

  const db = await getDb();
  const objectId = new ObjectId(userId);
  await Promise.all([
    db.collection("accounts").deleteMany({ userId: objectId }),
    db.collection("sessions").deleteMany({ userId: objectId }),
    db.collection("users").deleteOne({ _id: objectId }),
  ]);

  return NextResponse.json({ ok: true });
}
