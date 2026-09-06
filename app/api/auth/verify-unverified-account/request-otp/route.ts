import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import connectToDatabase from "@/lib/server/mongoose";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { PendingSignupModel } from "@/lib/models/pending-signup";
import { checkAndConsumeOtpRequestQuota } from "@/lib/server/auth-rate-limit";
import { sendOtpEmail } from "@/lib/server/email";
import bcrypt from "bcryptjs";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/verify-unverified-account/request-otp
 * 
 * Called when a user attempts to login but their account is not yet verified.
 * Validates the password matches, then sends a new OTP for email verification.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  
  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;

  await connectToDatabase;

  // Find the local credential record
  const localCred = await LocalCredentialModel.findOne({ email });
  if (!localCred) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Check if account is actually pending (shouldn't reach here if already verified)
  if (localCred.status === "verified") {
    return NextResponse.json({ error: "Your account is already verified — proceed to login." }, { status: 400 });
  }

  // Verify password matches
  const valid = await bcrypt.compare(password, localCred.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Check if account verification has expired (48 hours)
  if (localCred.verificationExpiresAt && new Date() > localCred.verificationExpiresAt) {
    return NextResponse.json({ error: "Verification period expired — please sign up again." }, { status: 410 });
  }

  // Check rate limit for OTP requests
  const quota = await checkAndConsumeOtpRequestQuota(email);
  if (!quota.allowed) {
    const message =
      quota.reason === "too-soon"
        ? "Wait a minute before requesting another code."
        : "Too many codes requested for this email today — try again tomorrow.";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  // Generate new OTP
  const code = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash("sha256").update(code).digest("hex");

  // Check if this is a resend
  const existingPending = await PendingSignupModel.findOne({ email });
  let resendCount = 0;
  
  if (existingPending) {
    resendCount = existingPending.resendCount ?? 0;
    if (resendCount >= 3) {
      return NextResponse.json(
        { error: "Maximum OTP resend attempts reached — try again in 24 hours." },
        { status: 429 }
      );
    }
  }

  // Upsert the pending signup for re-verification
  await PendingSignupModel.findOneAndUpdate(
    { email },
    {
      email,
      passwordHash: localCred.passwordHash,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      resendCount: resendCount + 1,
    },
    { upsert: true }
  );

  try {
    await sendOtpEmail(email, code);
  } catch {
    return NextResponse.json(
      { error: "Couldn't send the verification email right now — try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ 
    ok: true, 
    message: "A verification code has been sent to your email.",
    resendCount: resendCount + 1
  });
}
