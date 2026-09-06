import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import connectToDatabase from "@/lib/server/mongoose";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { PasswordResetModel } from "@/lib/models/password-reset";
import { checkAndConsumeOtpRequestQuota } from "@/lib/server/auth-rate-limit";
import { sendPasswordResetEmail } from "@/lib/server/email";
import { emailProvider } from "@/lib/server/auth-lookup";

const bodySchema = z.object({
  email: z.email(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  await connectToDatabase;

  const existing = await LocalCredentialModel.findOne({ email }).lean();
  if (!existing) {
    if ((await emailProvider(email)) === "google") {
      return NextResponse.json(
        { error: "This email uses Google sign-in — there's no password to reset." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
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

  await PasswordResetModel.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    },
    { upsert: true }
  );

  try {
    await sendPasswordResetEmail(email, code);
  } catch {
    // The reset doc still exists and will TTL-expire on its own — retrying
    // (which upserts) is safe.
    return NextResponse.json(
      { error: "Couldn't send the reset email right now — try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
