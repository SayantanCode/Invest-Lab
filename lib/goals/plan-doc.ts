// Shared shape for the "plans" MongoDB collection and the mapper that
// strips server-only fields (_id, userId) before a doc reaches the client.

import type { Types } from "mongoose";
import type { Plan } from "@/lib/engine";
import type { PlanType, SavedPlan } from "@/lib/stores/use-plans-store";

export interface PlanDoc {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  description?: string;
  planType: PlanType;
  plan: Plan;
  notes?: string;
  whyThisExists?: string;
  targetAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export function toClientPlan(doc: PlanDoc): SavedPlan {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    planType: doc.planType,
    plan: doc.plan,
    notes: doc.notes,
    whyThisExists: doc.whyThisExists,
    targetAmount: doc.targetAmount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
