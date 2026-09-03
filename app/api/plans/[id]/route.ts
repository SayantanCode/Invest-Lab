import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { auth } from "@/lib/server/auth";
import connectToDatabase from "@/lib/server/mongoose";
import { PlanModel } from "@/lib/models/plan";
import { toClientPlan, type PlanDoc } from "@/lib/goals/plan-doc";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const patch = await request.json();
  delete patch.id;
  delete patch._id;
  delete patch.userId;
  delete patch.createdAt;

  await connectToDatabase;
  const result = await PlanModel.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { $set: { ...patch, updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  ).lean<PlanDoc>();

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(toClientPlan(result));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await connectToDatabase;
  await PlanModel.deleteOne({ _id: id, userId: session.user.id });

  return NextResponse.json({ ok: true });
}
