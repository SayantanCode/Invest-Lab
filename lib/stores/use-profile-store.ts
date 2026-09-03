"use client";

import * as React from "react";
import { newId } from "@/lib/id";

const STORAGE_KEY = "investlab.profile.v1";

export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export interface Debt {
  id: string;
  label: string;
  outstandingAmount: number;
  /** Annual percent — drives the "pay this off before investing" flag. */
  interestRatePct: number;
  monthlyEMI: number;
  /** Months remaining on this loan — optional, undefined means "ongoing." Lets goal scheduling see the EMI drop off once it ends. */
  tenureMonths?: number;
}

export type DependentRelation = "spouse" | "child" | "parent" | "other";

export interface Dependent {
  id: string;
  relation: DependentRelation;
  /** Optional — lets a child's age drive an education-goal default, for instance. */
  age?: number;
}

export interface Profile {
  /** In-hand, post-tax. */
  monthlyIncome: number;
  /** Living expenses only — EMIs are summed from `debts`, caregiving costs from `monthlyCaregivingExpenses`, neither is included here. */
  monthlyExpenses: number;
  /** Medical/caregiving costs for parents or dependents, kept separate from monthlyExpenses so it stays visible instead of buried in one lump figure. */
  monthlyCaregivingExpenses: number;
  dependents: Dependent[];
  hasHealthInsurance: boolean;
  /** Only meaningful when hasHealthInsurance is true. */
  healthInsuranceCoverAmount?: number;
  hasTermLifeInsurance: boolean;
  /** Only meaningful when hasTermLifeInsurance is true. */
  termInsuranceCoverAmount?: number;
  /** Already set aside, today. */
  emergencyFundSaved: number;
  debts: Debt[];
  riskTolerance: RiskTolerance;
  /** Key into lib/city-cost-index.ts's CITIES — empty string means "not set", which leaves goal-cost suggestions unadjusted. */
  city: string;
  /** ISO date, optional — unlocks age-aware goal defaults (e.g. retirement years). */
  dob?: string;
  updatedAt: string; // ISO datetime
}

export type ProfileInput = Omit<Profile, "updatedAt">;

let cachedSnapshot: Profile | null | undefined = undefined;
const listeners = new Set<() => void>();

function readFromStorage(): Profile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // `city`/`monthlyCaregivingExpenses` were added after some profiles may
      // have already been saved — default them so old data doesn't feed
      // `undefined` into a controlled input (the same uncontrolled-input trap
      // existingSavings hit on Goal). `dependents` used to be a bare count —
      // migrate it to that many generically-typed entries so `.length` still
      // reads correctly everywhere downstream.
      const parsed = JSON.parse(raw) as Profile & { dependents: number | Dependent[] };
      const dependents: Dependent[] =
        typeof parsed.dependents === "number"
          ? Array.from({ length: parsed.dependents }, () => ({ id: newId(), relation: "other" as const }))
          : parsed.dependents;
      return { ...parsed, city: parsed.city ?? "", monthlyCaregivingExpenses: parsed.monthlyCaregivingExpenses ?? 0, dependents };
    }
  } catch {
    // localStorage unavailable — fall through to null.
  }
  return null;
}

// Same useSyncExternalStore pattern as use-plan-store.ts / use-goal-store.ts.
const SERVER_SNAPSHOT: Profile | null = null;

function getSnapshot(): Profile | null {
  if (cachedSnapshot === undefined) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): Profile | null {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeProfile(next: Profile | null) {
  cachedSnapshot = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Profile still works for this session even if it can't persist.
  }
  listeners.forEach((l) => l());
}

export function useProfileStore() {
  const profile = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveProfile = React.useCallback((input: ProfileInput) => {
    writeProfile({ ...input, updatedAt: new Date().toISOString() });
  }, []);

  const clearProfile = React.useCallback(() => {
    writeProfile(null);
  }, []);

  return { profile, saveProfile, clearProfile };
}

export function newDebt(): Debt {
  return { id: newId(), label: "", outstandingAmount: 0, interestRatePct: 12, monthlyEMI: 0 };
}

export function newDependent(): Dependent {
  return { id: newId(), relation: "other" };
}
