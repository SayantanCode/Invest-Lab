// When goals together need more than the available surplus, this suggests
// what to change — delay, shrink, or drop — reusing exactly the same math
// as everywhere else in this app (lib/goal-calc.ts), never inventing new
// numbers. Priority order mirrors the essentials-first philosophy already
// encoded in lib/prioritization.ts's waterfall: protect the things a
// livelihood depends on (emergency fund, retirement) before anything
// discretionary (a car, a vacation).

import type { Goal } from "@/lib/stores/use-goal-store";
import { inflatedTarget, requiredMonthlySip, requiredYearsToTarget } from "@/lib/calculators/goal-calc";

const PRESET_PRIORITY: Record<string, number> = {
  emergency: 0,
  retirement: 1,
  education: 1,
  home: 2,
  marriage: 3,
  custom: 3,
  vehicle: 4,
  bike: 4,
  travel: 5,
};

function priorityOf(goal: Goal): number {
  return PRESET_PRIORITY[goal.presetKey] ?? 3;
}

export interface AdjustmentOption {
  kind: "delay" | "reduceTarget" | "drop";
  description: string;
  newYears?: number;
  newTargetAmountToday?: number;
  monthlyFreed: number;
}

export interface GoalAdjustmentSuggestion {
  goal: Goal;
  currentSip: number;
  priorityTier: number;
  options: AdjustmentOption[];
}

function goalSip(goal: Goal): number {
  const target = inflatedTarget(goal.targetAmountToday, goal.inflationPct, goal.years);
  return requiredMonthlySip(target, goal.expectedReturnPct, goal.years, goal.existingSavings);
}

/** Minimum extra delay (added to goal.years, rounded to the nearest half-year) that brings the SIP to at or below `budget`. Null if it doesn't fit within 50 years, or no delay is actually needed. */
function minDelayToFit(goal: Goal, budget: number): number | null {
  if (budget <= 0) return null;
  const solved = requiredYearsToTarget(goal.targetAmountToday, goal.inflationPct, goal.expectedReturnPct, budget, goal.existingSavings);
  if (!solved.feasible) return null;
  const extra = Math.round((solved.years - goal.years) * 2) / 2;
  return extra > 0 ? extra : null;
}

const TARGET_CUT_SEARCH_STEPS = 40; // binary search iterations — far more precision than a rupee-rounded suggestion needs

/** The target-amount cut (0-1 fraction) that brings the SIP to at or below `budget`, at the goal's current years. Null if even a near-total cut still doesn't fit (budget itself is ~0), or no cut is needed. */
function targetCutToFit(goal: Goal, budget: number): number | null {
  if (budget <= 0) return null;
  if (goalSip(goal) <= budget) return null;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < TARGET_CUT_SEARCH_STEPS; i++) {
    const mid = (lo + hi) / 2;
    const trialTarget = inflatedTarget(goal.targetAmountToday * (1 - mid), goal.inflationPct, goal.years);
    const sip = requiredMonthlySip(trialTarget, goal.expectedReturnPct, goal.years, goal.existingSavings);
    if (sip <= budget) hi = mid;
    else lo = mid;
  }
  return hi >= 0.999 ? null : hi;
}

/**
 * Ranks goals from least to most essential and, for each, works out what
 * change would close the gap between total required SIP and `surplus` —
 * delay, shrink the target, or drop it outright. Stops once the shortfall
 * is covered; returns nothing if everything already fits.
 */
export function suggestGoalAdjustments(goals: Goal[], surplus: number): GoalAdjustmentSuggestion[] {
  const withSip = goals.map((goal) => ({ goal, sip: goalSip(goal) }));
  const total = withSip.reduce((sum, g) => sum + g.sip, 0);
  if (total <= surplus) return [];

  let shortfall = total - surplus;
  const sorted = [...withSip].sort((a, b) => priorityOf(b.goal) - priorityOf(a.goal));

  const suggestions: GoalAdjustmentSuggestion[] = [];
  for (const { goal, sip } of sorted) {
    if (shortfall <= 0) break;
    if (sip <= 0) continue;

    const targetSipForThisGoal = Math.max(0, sip - shortfall);
    const options: AdjustmentOption[] = [];

    const delayExtra = minDelayToFit(goal, targetSipForThisGoal);
    if (delayExtra != null) {
      const newYears = goal.years + delayExtra;
      const newTarget = inflatedTarget(goal.targetAmountToday, goal.inflationPct, newYears);
      const newSip = requiredMonthlySip(newTarget, goal.expectedReturnPct, newYears, goal.existingSavings);
      options.push({
        kind: "delay",
        description: `Delay "${goal.name}" by ${delayExtra} more year${delayExtra === 1 ? "" : "s"}`,
        newYears,
        monthlyFreed: sip - newSip,
      });
    }

    const cut = targetCutToFit(goal, targetSipForThisGoal);
    if (cut != null) {
      const newTargetAmountToday = Math.round((goal.targetAmountToday * (1 - cut)) / 1000) * 1000;
      const newTarget = inflatedTarget(newTargetAmountToday, goal.inflationPct, goal.years);
      const newSip = requiredMonthlySip(newTarget, goal.expectedReturnPct, goal.years, goal.existingSavings);
      options.push({
        kind: "reduceTarget",
        description: `Lower "${goal.name}"'s target by ${Math.round(cut * 100)}%`,
        newTargetAmountToday,
        monthlyFreed: sip - newSip,
      });
    }

    options.push({
      kind: "drop",
      description: `Drop "${goal.name}" for now`,
      monthlyFreed: sip,
    });

    suggestions.push({ goal, currentSip: sip, priorityTier: priorityOf(goal), options });
    // Conservative: assume this goal's full current SIP could be freed when
    // deciding whether the next-lowest-priority goal also needs adjusting.
    shortfall -= sip;
  }

  return suggestions;
}
