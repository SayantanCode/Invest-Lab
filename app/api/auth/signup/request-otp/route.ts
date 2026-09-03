import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import connectToDatabase from "@/lib/server/mongoose";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { PendingSignupModel } from "@/lib/models/pending-signup";
import { checkAndConsumeOtpRequestQuota } from "@/lib/server/auth-rate-limit";
import { sendOtpEmail } from "@/lib/server/email";
import { emailProvider } from "@/lib/server/auth-lookup";
import { getPasswordIssues } from "@/lib/password-policy";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;

  const passwordIssues = getPasswordIssues(password);
  if (passwordIssues.length > 0) {
    return NextResponse.json({ error: passwordIssues[0] }, { status: 400 });
  }

  await connectToDatabase;

  const existing = await LocalCredentialModel.findOne({ email }).lean();
  if (existing) {
    return NextResponse.json(
      { error: "An account already exists for this email — try signing in instead." },
      { status: 409 }
    );
  }

  if ((await emailProvider(email)) === "google") {
    return NextResponse.json(
      { error: 'This email is already registered with Google — use "Continue with Google" instead.' },
      { status: 409 }
    );
  }

  const quota = await checkAndConsumeOtpRequestQuota(email);
  if (!quota.allowed) {
    const message =
      quota.reason === "too-soon"
        ? "Wait a minute before requesting another code."
        : "Too many codes requested for this email today — try again tomorrow.";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash("sha256").update(code).digest("hex");
  const passwordHash = await bcrypt.hash(password, 10);

  await PendingSignupModel.findOneAndUpdate(
    { email },
    {
      email,
      passwordHash,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    },
    { upsert: true }
  );

  try {
    await sendOtpEmail(email, code);
  } catch {
    // The pending-signup doc still exists and will TTL-expire on its own —
    // retrying (which upserts) is safe. Most likely cause locally: Brevo
    // isn't configured yet (BREVO_API_KEY / BREVO_FROM_EMAIL).
    return NextResponse.json(
      { error: "Couldn't send the verification email right now — try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
