// Turns a Goal (lib/use-goal-store.ts) into a real, simulatable Plan — the
// same scratch-plan-through-the-engine trick used throughout this app.
// Shared by GoalsDashboard's "Create a plan" button and the onboarding
// wizard, which both need the exact same conversion.

import type { Goal } from "@/lib/stores/use-goal-store";
import type { Plan } from "@/lib/engine";
import { addYearsUTC, parseISO, toISODate } from "@/lib/engine";
import { makeDefaultPlan } from "@/lib/goals/default-plan";
import { deriveReturnBand } from "@/components/plan/simple-plan-card";
import { newId } from "@/lib/id";
import { inflatedTarget, requiredMonthlySip } from "@/lib/calculators/goal-calc";

export function buildPlanFromGoal(goal: Goal): Plan {
  const start = toISODate(new Date());
  const base = makeDefaultPlan(start);
  const target = inflatedTarget(goal.targetAmountToday, goal.inflationPct, goal.years);
  const rawSip = requiredMonthlySip(target, goal.expectedReturnPct, goal.years, goal.existingSavings);
  const sip = rawSip > 0 ? Math.max(500, Math.ceil(rawSip / 100) * 100) : 0;
  const { conservative, optimistic } = deriveReturnBand(goal.expectedReturnPct);

  const events: Plan["events"] = sip > 0 ? [{ id: newId(), type: "SIP_START", date: start, amount: sip }] : [];
  if (goal.existingSavings > 0) {
    events.push({ id: newId(), type: "LUMPSUM", date: start, amount: goal.existingSavings, label: "Already saved" });
  }

  return {
    ...base,
    id: newId(),
    name: goal.name,
    endDate: toISODate(addYearsUTC(parseISO(start), goal.years)),
    assumptions: {
      ...base.assumptions,
      returns: { conservative, expected: goal.expectedReturnPct, optimistic },
    },
    events,
  };
}
