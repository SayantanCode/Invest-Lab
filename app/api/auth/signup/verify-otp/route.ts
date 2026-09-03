import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import connectToDatabase from "@/lib/server/mongoose";
import { getDb } from "@/lib/server/mongodb";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { PendingSignupModel } from "@/lib/models/pending-signup";
import { emailProvider } from "@/lib/server/auth-lookup";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const { code } = parsed.data;

  await connectToDatabase;
  const pending = await PendingSignupModel.findOne({ email });
  if (!pending) {
    return NextResponse.json(
      { error: "No signup in progress for this email — request a new code." },
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

  // Verified — create the real, permanent account. Insert into the
  // adapter's own native `users` collection (not Mongoose) so the shape
  // matches exactly what @auth/mongodb-adapter already produces for Google
  // sign-ins, keeping every login method interchangeable afterward.
  const existingCred = await LocalCredentialModel.findOne({ email }).lean();
  if (existingCred) {
    await pending.deleteOne();
    return NextResponse.json(
      { error: "An account already exists for this email — try signing in instead." },
      { status: 409 }
    );
  }

  if ((await emailProvider(email)) === "google") {
    await pending.deleteOne();
    return NextResponse.json(
      { error: 'This email is already registered with Google — use "Continue with Google" instead.' },
      { status: 409 }
    );
  }

  const db = await getDb();
  const userResult = await db.collection("users").insertOne({
    name: email.split("@")[0],
    email,
    emailVerified: new Date(),
    image: null,
  });

  await LocalCredentialModel.create({
    userId: userResult.insertedId.toString(),
    email,
    passwordHash: pending.passwordHash,
    createdAt: new Date().toISOString(),
  });

  await pending.deleteOne();

  return NextResponse.json({ ok: true });
}
