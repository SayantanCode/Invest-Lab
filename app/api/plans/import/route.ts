import { NextResponse } from "next/server";

import { auth } from "@/lib/server/auth";
import connectToDatabase from "@/lib/server/mongoose";
import { PlanModel } from "@/lib/models/plan";
import { toClientPlan, type PlanDoc } from "@/lib/goals/plan-doc";
import type { PlanType } from "@/lib/stores/use-plans-store";
import type { Plan } from "@/lib/engine";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const localPlans: Array<{
    name: string;
    description?: string;
    planType: PlanType;
    plan: Plan;
    notes?: string;
    whyThisExists?: string;
    targetAmount?: number;
  }> = Array.isArray(body?.plans) ? body.plans : [];

  if (localPlans.length === 0) return NextResponse.json([]);

  const now = new Date().toISOString();
  const docs = localPlans.map((p) => ({
    userId: session.user.id,
    name: p.name,
    description: p.description,
    planType: p.planType,
    plan: p.plan,
    notes: p.notes,
    whyThisExists: p.whyThisExists,
    targetAmount: p.targetAmount,
    createdAt: now,
    updatedAt: now,
  }));

  await connectToDatabase;
  const created = await PlanModel.insertMany(docs);

  return NextResponse.json(created.map((doc) => toClientPlan(doc.toObject() as PlanDoc)));
}
