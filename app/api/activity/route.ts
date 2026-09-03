import { NextResponse } from "next/server";
import type { Types } from "mongoose";

import { auth } from "@/lib/server/auth";
import connectToDatabase from "@/lib/server/mongoose";
import { ActivityModel } from "@/lib/models/activity";
import type { ActivityKind } from "@/lib/stores/use-activity-log-store";

const MAX_ENTRIES = 50;

interface ActivityDoc {
  _id: Types.ObjectId;
  userId: string;
  kind: ActivityKind;
  message: string;
  planId?: string;
  at: string;
}

function toClient(doc: ActivityDoc) {
  return { id: doc._id.toString(), kind: doc.kind, message: doc.message, planId: doc.planId, at: doc.at };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase;
  const docs = await ActivityModel.find({ userId: session.user.id })
    .sort({ at: -1 })
    .limit(MAX_ENTRIES)
    .lean<ActivityDoc[]>();

  return NextResponse.json(docs.map(toClient));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  await connectToDatabase;
  const doc = await ActivityModel.create({
    userId: session.user.id,
    kind: body.kind,
    message: body.message,
    planId: body.planId,
    at: new Date().toISOString(),
  });

  return NextResponse.json(toClient(doc.toObject() as ActivityDoc));
}
