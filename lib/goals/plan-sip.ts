// Reads/writes the plan's primary recurring SIP — the one SIP_START event
// every plan has, whose amount is what Simple's slider, Advanced's slider,
// and multi-fund allocation (as the ceiling for a fund's rupee split) all
// point at.

import type { Plan } from "@/lib/engine";
import { newId } from "@/lib/id";

export function primarySipAmount(plan: Plan): number {
  const sip = plan.events.find((e) => e.type === "SIP_START");
  return sip && sip.type === "SIP_START" ? sip.amount : 0;
}

export function withPrimarySipAmount(plan: Plan, amount: number): Plan {
  const hasSip = plan.events.some((e) => e.type === "SIP_START");
  const events = hasSip
    ? plan.events.map((e) => (e.type === "SIP_START" ? { ...e, amount } : e))
    : [{ id: newId(), type: "SIP_START" as const, date: plan.startDate, amount }, ...plan.events];
  return { ...plan, events };
}
