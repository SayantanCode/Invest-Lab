import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import connectToDatabase from "@/lib/server/mongoose";
import { getDb } from "@/lib/server/mongodb";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { PendingSignupModel } from "@/lib/models/pending-signup";

const bodySchema = z.object({
  email: z.email(),
  code: z.string().length(6),
});

const MAX_ATTEMPTS = 5;

/**
 * POST /api/auth/verify-unverified-account/verify-otp
 * 
 * Verifies OTP for an existing account that hasn't yet verified their email.
 * This is used when a user tries to login but their account is pending verification.
 * 
 * Differs from signup/verify-otp in that:
 * - The account already exists in the database
 * - We only update the status to verified, don't create new user/credential
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const { code } = parsed.data;

  await connectToDatabase;
  
  // Get the pending signup record
  const pending = await PendingSignupModel.findOne({ email });
  if (!pending) {
    return NextResponse.json(
      { error: "No verification in progress for this email — request a new code." },
      { status: 404 }
    );
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await pending.deleteOne();
    return NextResponse.json({ error: "That code expired — request a new one." }, { status: 410 });
  }

  if (pending.attempts >= MAX_ATTEMPTS) {
    await pending.deleteOne();
    return NextResponse.json({ error: "Too many attempts — request a new code." }, { status: 429 });
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  if (codeHash !== pending.otpHash) {
    pending.attempts += 1;
    await pending.save();
    return NextResponse.json({ error: "That code doesn't match." }, { status: 400 });
  }

  // Find the existing local credential
  const localCred = await LocalCredentialModel.findOne({ email });
  if (!localCred) {
    await pending.deleteOne();
    return NextResponse.json({ error: "Account not found — contact support." }, { status: 404 });
  }

  // Check if already verified
  if (localCred.status === "verified") {
    await pending.deleteOne();
    return NextResponse.json({ error: "Account already verified — proceed to login." }, { status: 400 });
  }

  // Update local credential to verified
  localCred.status = "verified";
  localCred.verificationExpiresAt = null;
  await localCred.save();

  // Update the user's emailVerified field in NextAuth collection
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: localCred.userId },
    { $set: { emailVerified: new Date() } }
  );

  await pending.deleteOne();

  return NextResponse.json({ ok: true, email });
}
