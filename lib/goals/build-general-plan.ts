// Turns "just invest this much, no specific goal" into a real, simulatable
// Plan — the goal-less sibling of build-plan-from-goal.ts, for beginners who
// don't have a target/timeline in mind yet. Reuses makeDefaultPlan's shape
// (one open-ended SIP, no completion date) rather than inventing a new one.

import type { Plan } from "@/lib/engine";
import { makeDefaultPlan, todayISO } from "@/lib/goals/default-plan";
import { deriveReturnBand } from "@/components/plan/simple-plan-card";
import { newId } from "@/lib/id";

export function buildGeneralPlan(input: { monthlyAmount: number; lumpsum: number; expectedReturnPct: number }): Plan {
  const start = todayISO();
  const base = makeDefaultPlan(start);
  const { conservative, optimistic } = deriveReturnBand(input.expectedReturnPct);

  const events: Plan["events"] = [];
  if (input.monthlyAmount > 0) {
    events.push({ id: newId(), type: "SIP_START", date: start, amount: input.monthlyAmount });
  }
  if (input.lumpsum > 0) {
    events.push({ id: newId(), type: "LUMPSUM", date: start, amount: input.lumpsum, label: "Starting lump sum" });
  }

  return {
    ...base,
    id: newId(),
    name: "General investing",
    assumptions: {
      ...base.assumptions,
      returns: { conservative, expected: input.expectedReturnPct, optimistic },
    },
    events,
  };
}
