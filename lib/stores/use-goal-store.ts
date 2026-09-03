"use client";

import * as React from "react";
import { newId } from "@/lib/id";

const STORAGE_KEY = "investlab.goals.v1";

export interface Goal {
  id: string;
  name: string;
  presetKey: string;
  targetAmountToday: number;
  years: number;
  inflationPct: number;
  expectedReturnPct: number;
  /** Savings already set aside for this goal — grows on its own, reducing (or covering outright) the required SIP. */
  existingSavings: number;
  /** For a purchase partly financed by a loan (home/vehicle/bike/education/marriage) — `targetAmountToday` is the down payment being saved for, these describe the loan on the rest. All three present or all three absent. */
  loanAmount?: number;
  loanRatePct?: number;
  loanYears?: number;
  createdAt: string; // ISO datetime
}

export type GoalInput = Omit<Goal, "id" | "createdAt">;

let cachedSnapshot: Goal[] | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): Goal[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // existingSavings was added after some goals may have already been saved —
    // default it so old data doesn't feed `undefined` into the math or turn a
    // slider input from uncontrolled to controlled mid-render.
    if (raw) return (JSON.parse(raw) as Goal[]).map((g) => ({ ...g, existingSavings: g.existingSavings ?? 0 }));
  } catch {
    // localStorage unavailable — fall through to empty.
  }
  return [];
}

// Same useSyncExternalStore pattern as use-plan-store.ts / use-scenario-store.ts.
const SERVER_SNAPSHOT: Goal[] = [];

function getSnapshot(): Goal[] {
  if (cachedSnapshot == null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): Goal[] {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeGoals(next: Goal[]) {
  cachedSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Goals still work for this session even if they can't persist.
  }
  listeners.forEach((l) => l());
}

export function useGoalStore() {
  const goals = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveGoal = React.useCallback((input: GoalInput) => {
    const goal: Goal = { ...input, id: newId(), createdAt: new Date().toISOString() };
    writeGoals([...getSnapshot(), goal]);
    return goal;
  }, []);

  const updateGoal = React.useCallback((id: string, input: GoalInput) => {
    writeGoals(getSnapshot().map((g) => (g.id === id ? { ...g, ...input } : g)));
  }, []);

  const deleteGoal = React.useCallback((id: string) => {
    writeGoals(getSnapshot().filter((g) => g.id !== id));
  }, []);

  return { goals, saveGoal, updateGoal, deleteGoal };
}
