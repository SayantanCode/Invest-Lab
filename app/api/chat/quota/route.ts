import { auth } from "@/lib/server/auth";
import { peekQuota } from "@/lib/server/ai-rate-limit";

/** Read-only quota check for the AI panel's "N left today" display — never consumes a use, unlike POST /api/chat. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const quota = await peekQuota(session.user.id);
  return Response.json(quota);
}
