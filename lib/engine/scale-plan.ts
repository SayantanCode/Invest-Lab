// Scales every rupee amount in a plan's events by a fixed factor — the
// mechanism behind multi-fund allocation: a ₹6,000 SIP split 40/60 across
// two funds is modeled as two independent plans, one scaled by 0.4 and one
// by 0.6, each replayed through the ordinary single-fund engine and then
// merged (see portfolio-replay.ts). Percent step-ups don't need scaling —
// a percentage of a smaller base is already proportionally smaller.

import type { Plan, PlanEvent } from "./types";

export function scalePlanEvents(events: PlanEvent[], factor: number): PlanEvent[] {
  return events.map((evt): PlanEvent => {
    switch (evt.type) {
      case "SIP_START":
        return { ...evt, amount: evt.amount * factor };
      case "SIP_STEPUP":
        return evt.mode === "amount" ? { ...evt, value: evt.value * factor } : evt;
      case "SIP_RESUME":
        return evt.amount != null ? { ...evt, amount: evt.amount * factor } : evt;
      case "LUMPSUM":
        return { ...evt, amount: evt.amount * factor };
      case "WITHDRAWAL":
        return { ...evt, amount: evt.amount * factor };
      case "SWP_START":
        return { ...evt, amount: evt.amount * factor };
      default:
        return evt;
    }
  });
}

export function scalePlan(plan: Plan, factor: number): Plan {
  return { ...plan, events: scalePlanEvents(plan.events, factor) };
}
