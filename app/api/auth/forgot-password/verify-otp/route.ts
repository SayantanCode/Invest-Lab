import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import connectToDatabase from "@/lib/server/mongoose";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { PasswordResetModel } from "@/lib/models/password-reset";
import { getPasswordIssues } from "@/lib/password-policy";

const bodySchema = z.object({
  email: z.email(),
  code: z.string().length(6),
  newPassword: z.string().min(1),
});

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code and a new password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { code, newPassword } = parsed.data;

  const passwordIssues = getPasswordIssues(newPassword);
  if (passwordIssues.length > 0) {
    return NextResponse.json({ error: passwordIssues[0] }, { status: 400 });
  }

  await connectToDatabase;
  const reset = await PasswordResetModel.findOne({ email });
  if (!reset) {
    return NextResponse.json(
      { error: "No password reset in progress for this email — request a new code." },
      { status: 404 }
    );
  }

  if (reset.expiresAt.getTime() < Date.now()) {
    await reset.deleteOne();
    return NextResponse.json({ error: "That code expired — request a new one." }, { status: 410 });
  }

  if (reset.attempts >= MAX_ATTEMPTS) {
    await reset.deleteOne();
    return NextResponse.json({ error: "Too many attempts — request a new code." }, { status: 429 });
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  if (codeHash !== reset.otpHash) {
    reset.attempts += 1;
    await reset.save();
    return NextResponse.json({ error: "That code doesn't match." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await LocalCredentialModel.findOneAndUpdate({ email }, { passwordHash });
  await reset.deleteOne();

  if (!updated) {
    return NextResponse.json(
      { error: "That account no longer has a password to reset — try signing in another way." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
