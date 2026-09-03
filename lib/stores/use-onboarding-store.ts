"use client";

import * as React from "react";

const STORAGE_KEY = "investlab.onboarding.v1";

interface OnboardingState {
  completed: boolean;
}

const EMPTY: OnboardingState = { completed: false };

let cachedSnapshot: OnboardingState | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): OnboardingState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch {
    // localStorage unavailable — fall through to default.
  }
  return EMPTY;
}

function getSnapshot(): OnboardingState {
  if (cachedSnapshot == null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): OnboardingState {
  return EMPTY;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function write(next: OnboardingState) {
  cachedSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Preference just won't persist across reloads.
  }
  listeners.forEach((l) => l());
}

export function useOnboardingStore() {
  const state = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const markCompleted = React.useCallback(() => write({ completed: true }), []);
  const reset = React.useCallback(() => write({ completed: false }), []);

  return { ...state, markCompleted, reset };
}
