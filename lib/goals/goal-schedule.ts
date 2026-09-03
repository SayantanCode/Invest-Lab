// Answers "in how many years can I do what, what's the max I can invest" —
// the piece goalCapacityRecommendation (lib/prioritization.ts) deliberately
// doesn't solve: it only flags a total conflict, it doesn't say *which*
// goal waits or *when* it can start. This is a simple, honest greedy
// scheduler, not an optimizer: goals are prioritized soonest-need-first
// (shortest `years` first — the existing "emergency" preset's short default
// already self-prioritizes under this rule, no special-casing needed), and
// a goal that can't start immediately is shown starting later and
// completing later by the same amount — never silently squeezed to fit.

import type { Goal } from "@/lib/stores/use-goal-store";
import { inflatedTarget, requiredMonthlySip } from "@/lib/calculators/goal-calc";

export interface ScheduledGoal {
  goal: Goal;
  sip: number;
  /** Months from today. */
  startMonth: number;
  /** Months from today. */
  completesMonth: number;
  delayedMonths: number;
  /** False when the goal can't start within the horizon at all — an honest "doesn't fit," not a fabricated far-future date. */
  feasible: boolean;
}

const MAX_HORIZON_MONTHS = 600; // 50 years — a safety cap, not a real limit

export function scheduleGoals(goals: Goal[], monthlySurplus: number | ((month: number) => number)): ScheduledGoal[] {
  const surplusAt = typeof monthlySurplus === "function" ? monthlySurplus : () => monthlySurplus;
  const sorted = [...goals].sort((a, b) => a.years - b.years);
  const active: { sip: number; endsAt: number }[] = [];
  const scheduled: ScheduledGoal[] = [];

  for (const goal of sorted) {
    const target = inflatedTarget(goal.targetAmountToday, goal.inflationPct, goal.years);
    const sip = requiredMonthlySip(target, goal.expectedReturnPct, goal.years, goal.existingSavings);

    if (sip <= 0) {
      scheduled.push({ goal, sip: 0, startMonth: 0, completesMonth: 0, delayedMonths: 0, feasible: true });
      continue;
    }

    let startMonth = 0;
    let feasible = true;
    while (true) {
      const committed = active.filter((a) => a.endsAt > startMonth).reduce((sum, a) => sum + a.sip, 0);
      if (surplusAt(startMonth) - committed >= sip) break;
      startMonth++;
      if (startMonth > MAX_HORIZON_MONTHS) {
        feasible = false;
        break;
      }
    }

    if (!feasible) {
      scheduled.push({ goal, sip, startMonth: 0, completesMonth: 0, delayedMonths: 0, feasible: false });
      continue;
    }

    const completesMonth = startMonth + Math.round(goal.years * 12);
    active.push({ sip, endsAt: completesMonth });
    scheduled.push({ goal, sip, startMonth, completesMonth, delayedMonths: startMonth, feasible: true });
  }

  // Restore the caller's original order for display — the internal sort is
  // scheduling priority, not necessarily the order a user expects to see.
  const byGoalId = new Map(scheduled.map((s) => [s.goal.id, s]));
  return goals.map((g) => byGoalId.get(g.id)!);
}
