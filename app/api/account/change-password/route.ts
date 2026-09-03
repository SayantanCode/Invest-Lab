import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/lib/server/auth";
import connectToDatabase from "@/lib/server/mongoose";
import { LocalCredentialModel } from "@/lib/models/local-credential";
import { getPasswordIssues } from "@/lib/password-policy";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your current password and a new one." }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const passwordIssues = getPasswordIssues(newPassword);
  if (passwordIssues.length > 0) {
    return NextResponse.json({ error: passwordIssues[0] }, { status: 400 });
  }

  await connectToDatabase;
  const cred = await LocalCredentialModel.findOne({ userId: session.user.id });
  if (!cred) {
    return NextResponse.json(
      { error: "Your account uses Google sign-in — there's no password to change." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, cred.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  cred.passwordHash = await bcrypt.hash(newPassword, 10);
  await cred.save();

  return NextResponse.json({ ok: true });
}
