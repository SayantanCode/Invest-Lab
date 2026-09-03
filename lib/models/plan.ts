// Mirrors lib/goals/plan-doc.ts's PlanDoc shape exactly — createdAt/updatedAt stay
// plain ISO strings (not Mongoose's Date-based `timestamps` option, which
// would collide with these same field names as Dates) so every existing
// client-side consumer (formatDate, string .slice(0, 10) calls, etc.) keeps
// working unchanged. versionKey is still off — nothing anywhere reads __v.

import { Schema, model, models } from "mongoose";

const PlanSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    planType: { type: String, required: true },
    plan: { type: Schema.Types.Mixed, required: true },
    notes: String,
    whyThisExists: String,
    targetAmount: Number,
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const PlanModel = models.Plan ?? model("Plan", PlanSchema, "plans");
