// Answers "which auth method does this email actually use" against the
// adapter's own native collections — Credentials sign-ins never create an
// `accounts` entry (only OAuth linking does), so a `google`-provider account
// existing there is a reliable signal the email was never meant to have a
// password, independent of whatever `local_credentials` says.

import { getDb } from "@/lib/server/mongodb";

export async function emailProvider(email: string): Promise<"google" | null> {
  const db = await getDb();
  const user = await db.collection("users").findOne({ email });
  if (!user) return null;

  const account = await db.collection("accounts").findOne({ userId: user._id, provider: "google" });
  return account ? "google" : null;
}
