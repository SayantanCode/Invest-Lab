import type { Plan } from "@/lib/engine";
import { addYearsUTC, parseISO, toISODate } from "@/lib/engine";

/** Local calendar date (not UTC-shifted) — avoids the day flipping near midnight in +offset timezones. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** What a first-time visitor sees: one SIP, nothing to configure yet. Simple-mode friendly. */
export function makeDefaultPlan(startDate: string = todayISO()): Plan {
  return {
    id: "default",
    name: "My Investment Plan",
    startDate,
    endDate: toISODate(addYearsUTC(parseISO(startDate), 15)),
    assumptions: {
      returns: { conservative: 8, expected: 12, optimistic: 15 },
      inflation: 6,
      inflationEnabled: false,
      stepUp: { enabled: false, percent: 10 },
    },
    events: [{ id: "e1", type: "SIP_START", date: startDate, amount: 5000, label: "Start SIP" }],
  };
}

/** A richer, pre-filled plan for people who want to see what Advanced mode can do. */
export function makeExamplePlan(): Plan {
  return {
    id: "example",
    name: "Example: raises, a pause, and a lumpsum",
    startDate: "2026-01-01",
    endDate: "2040-01-01",
    assumptions: {
      returns: { conservative: 8, expected: 12, optimistic: 15 },
      inflation: 6,
      inflationEnabled: true,
      stepUp: { enabled: false, percent: 10 },
    },
    events: [
      { id: "e1", type: "SIP_START", date: "2026-01-01", amount: 5000, label: "Start SIP" },
      { id: "e2", type: "SIP_STEPUP", date: "2027-01-01", mode: "percent", value: 10, label: "Annual step-up" },
      { id: "e3", type: "SIP_STEPUP", date: "2029-01-01", mode: "amount", value: 8000, label: "Raise to ₹8,000" },
      { id: "e4", type: "SIP_PAUSE", date: "2031-01-01", label: "Pause" },
      { id: "e5", type: "SIP_RESUME", date: "2032-01-01", amount: 10000, label: "Resume at ₹10,000" },
      { id: "e6", type: "LUMPSUM", date: "2034-01-01", amount: 200000, label: "Bonus lumpsum" },
      { id: "e7", type: "WITHDRAWAL", date: "2038-06-01", amount: 300000, label: "Partial withdrawal" },
    ],
  };
}
