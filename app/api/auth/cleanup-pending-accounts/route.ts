import { NextResponse } from "next/server";

import connectToDatabase from "@/lib/server/mongoose";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { getDb } from "@/lib/server/mongodb";
import { ObjectId } from "mongodb";

/**
 * DELETE /api/auth/cleanup-pending-accounts
 * 
 * Internal endpoint to remove pending accounts older than 48 hours.
 * Should be called by a scheduled cron job (e.g., Vercel Cron, external scheduler).
 * 
 * Authentication: Uses a simple secret check via query param or header
 * (configure in environment as AUTH_CLEANUP_SECRET).
 */
export async function DELETE(request: Request) {
  // Simple authentication using a secret
  const authSecret = request.headers.get("x-cleanup-secret") || 
                    new URL(request.url).searchParams.get("secret");
  
  if (authSecret !== process.env.AUTH_CLEANUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase;

  // Find all pending accounts that have expired (> 48 hours old)
  const now = new Date();
  const expiredPendingAccounts = await LocalCredentialModel.find({
    status: "pending",
    verificationExpiresAt: { $lt: now }
  }).lean<{ userId: string; email: string }[]>();

  if (expiredPendingAccounts.length === 0) {
    return NextResponse.json({ ok: true, deletedCount: 0 });
  }

  const db = await getDb();
  
  // Delete from local_credentials collection
  const localCredResult = await LocalCredentialModel.deleteMany({
    status: "pending",
    verificationExpiresAt: { $lt: now }
  });

  // Delete corresponding users from NextAuth users collection
  const userIds = expiredPendingAccounts.map(acc => new ObjectId(acc.userId));
  const usersResult = await db.collection("users").deleteMany({
    _id: { $in: userIds }
  });

  // Delete any related pending signup records
  const emailsToDelete = expiredPendingAccounts.map(acc => acc.email);
  const pendingResult = await db.collection("pending_signups").deleteMany({
    email: { $in: emailsToDelete }
  });

  return NextResponse.json({ 
    ok: true, 
    deletedCount: localCredResult.deletedCount,
    details: {
      localCredentials: localCredResult.deletedCount,
      users: usersResult.deletedCount,
      pendingSignups: pendingResult.deletedCount
    }
  });
}
