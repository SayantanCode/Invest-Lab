import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/server/auth";
import { sendReportEmail } from "@/lib/server/email";
import { checkAndConsumeReportEmailQuota } from "@/lib/server/auth-rate-limit";

// Generous ceiling for a text-only report PDF (a real one is a few hundred
// KB at most) — just a sanity cap against an oversized/garbage payload, not
// a real size limit anyone should ever hit.
const MAX_BASE64_LENGTH = 5_000_000;

const bodySchema = z.object({
  pdfBase64: z.string().min(1).max(MAX_BASE64_LENGTH),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Missing report data." }, { status: 400 });

  const quota = await checkAndConsumeReportEmailQuota(session.user.email);
  if (!quota.allowed) {
    const message =
      quota.reason === "too-soon"
        ? "Wait a moment before requesting another copy."
        : "You've reached today's limit for emailing this report — try again tomorrow.";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  try {
    const filename = `investlab-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    await sendReportEmail(session.user.email, parsed.data.pdfBase64, filename);
  } catch {
    return NextResponse.json({ error: "Couldn't send the email right now — try again in a moment." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
