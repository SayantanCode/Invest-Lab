// Core types for the InvestLab simulation engine.
// Deliberately framework-free (no React) so it can later run in a Node
// data-pipeline script as well as in the browser. See app plan doc, Section 12.

export type EventType =
  | "SIP_START"
  | "SIP_STEPUP"
  | "SIP_PAUSE"
  | "SIP_RESUME"
  | "SIP_STOP"
  | "LUMPSUM"
  | "WITHDRAWAL"
  | "SWP_START"
  | "SWP_STOP";

interface BaseEvent {
  id: string;
  date: string; // ISO yyyy-MM-dd
  type: EventType;
  label?: string;
}

export interface SipStartEvent extends BaseEvent {
  type: "SIP_START";
  amount: number;
}

export interface SipStepUpEvent extends BaseEvent {
  type: "SIP_STEPUP";
  mode: "percent" | "amount";
  value: number; // percent (e.g. 10 for 10%) or new absolute amount
}

export interface SipPauseEvent extends BaseEvent {
  type: "SIP_PAUSE";
}

export interface SipResumeEvent extends BaseEvent {
  type: "SIP_RESUME";
  amount?: number; // if omitted, resumes at the last active amount
}

export interface SipStopEvent extends BaseEvent {
  type: "SIP_STOP";
}

export interface LumpsumEvent extends BaseEvent {
  type: "LUMPSUM";
  amount: number;
}

export interface WithdrawalEvent extends BaseEvent {
  type: "WITHDRAWAL";
  amount: number;
}

/** Starts a recurring monthly withdrawal (SWP) — the mirror of SIP_START, same mechanics, opposite direction. */
export interface SwpStartEvent extends BaseEvent {
  type: "SWP_START";
  amount: number;
}

export interface SwpStopEvent extends BaseEvent {
  type: "SWP_STOP";
}

export type PlanEvent =
  | SipStartEvent
  | SipStepUpEvent
  | SipPauseEvent
  | SipResumeEvent
  | SipStopEvent
  | LumpsumEvent
  | WithdrawalEvent
  | SwpStartEvent
  | SwpStopEvent;

export type ScenarioKey = "conservative" | "expected" | "optimistic";

export interface Assumptions {
  /** Annual expected-return assumptions per scenario, as a percent (e.g. 12 for 12%). Forecast mode only. */
  returns: Record<ScenarioKey, number>;
  /** Annual inflation assumption, as a percent. */
  inflation: number;
  /** Whether inflation-adjusted figures are shown/applied. Off by default — Simple mode only. */
  inflationEnabled: boolean;
  /** Simple mode's one-dial annual step-up: applied as a recurring SIP_STEPUP event per anniversary year when enabled. */
  stepUp: { enabled: boolean; percent: number };
}

/**
 * One slice of a multi-fund portfolio: a real ₹6,000 SIP rarely goes into a
 * single fund, so a plan can optionally split every contribution across
 * several. `weightPct` values across a plan's `allocations` should sum to
 * 100 — the UI is responsible for enforcing that, the engine just trusts it.
 */
export interface FundAllocation {
  id: string;
  label: string;
  weightPct: number;
  /** Forecast-mode only: per-fund return assumptions. Falls back to the plan's own if omitted. */
  returns?: Record<ScenarioKey, number>;
  /** Historical-mode only: the real fund this slice is backtested against. */
  historicalScheme?: { schemeCode: number; schemeName: string };
  /**
   * Events that apply to this fund only, layered on top of the plan's
   * shared events (which get scaled by weightPct as usual) — a pause, an
   * extra lumpsum, a withdrawal, or a switch out to another fund, without
   * touching every other allocation. Face-value amounts, not scaled.
   */
  extraEvents?: PlanEvent[];
}

export interface Plan {
  id: string;
  name: string;
  startDate: string; // ISO yyyy-MM-dd
  endDate: string; // ISO yyyy-MM-dd
  events: PlanEvent[];
  assumptions: Assumptions;
  /** The mfapi.in scheme this plan is backtested against in Historical mode, when it's a single fund. */
  historicalScheme?: { schemeCode: number; schemeName: string };
  /** When present with 2+ entries, this plan is a multi-fund portfolio instead of a single fund. */
  allocations?: FundAllocation[];
}

export interface LedgerRow {
  date: string;
  eventLabel: string;
  contribution: number; // positive = money in, negative = money out (withdrawal)
  nav: number;
  units: number; // units bought(+) / sold(-) this row
  totalUnits: number;
  totalInvested: number;
  totalWithdrawn: number;
  value: number;
  gain: number;
}

export interface SimulationResult {
  scenario: ScenarioKey | "historical";
  ledger: LedgerRow[];
  totalInvested: number;
  totalWithdrawn: number;
  finalValue: number;
  gain: number;
  absoluteReturnPct: number;
  xirrPct: number | null;
  realFinalValue: number; // inflation-adjusted
  realXirrPct: number | null;
}

export const SCENARIOS: ScenarioKey[] = ["conservative", "expected", "optimistic"];

export const SCENARIO_LABEL: Record<ScenarioKey, string> = {
  conservative: "Conservative",
  expected: "Expected",
  optimistic: "Optimistic",
};
