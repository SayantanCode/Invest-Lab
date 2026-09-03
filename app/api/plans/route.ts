import { NextResponse } from "next/server";

import { auth } from "@/lib/server/auth";
import connectToDatabase from "@/lib/server/mongoose";
import { PlanModel } from "@/lib/models/plan";
import { toClientPlan, type PlanDoc } from "@/lib/goals/plan-doc";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase;
  const docs = await PlanModel.find({ userId: session.user.id }).sort({ updatedAt: -1 }).lean<PlanDoc[]>();

  return NextResponse.json(docs.map(toClientPlan));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const now = new Date().toISOString();

  await connectToDatabase;
  const doc = await PlanModel.create({
    userId: session.user.id,
    name: body.name ?? "Untitled plan",
    description: body.description,
    planType: body.planType,
    plan: body.plan,
    notes: body.notes,
    whyThisExists: body.whyThisExists,
    targetAmount: body.targetAmount,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(toClientPlan(doc.toObject() as PlanDoc));
}
