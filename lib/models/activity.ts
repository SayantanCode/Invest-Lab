import { Schema, model, models } from "mongoose";

const ActivitySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, required: true },
    message: { type: String, required: true },
    planId: String,
    at: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

export const ActivityModel = models.Activity ?? model("Activity", ActivitySchema, "activity");
