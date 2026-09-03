"use client";

import * as React from "react";
import { newId } from "@/lib/id";

const STORAGE_KEY = "investlab.activity.v1";
const MAX_ENTRIES = 50;

export type ActivityKind =
  | "plan_created"
  | "plan_updated"
  | "plan_duplicated"
  | "plan_deleted"
  | "plan_imported"
  | "event_added"
  | "event_removed";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  message: string;
  planId?: string;
  at: string; // ISO datetime
}

let cachedSnapshot: ActivityEntry[] | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): ActivityEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ActivityEntry[];
  } catch {
    // localStorage unavailable (private mode, quota) — fall through to empty.
  }
  return [];
}

const SERVER_SNAPSHOT: ActivityEntry[] = [];

function getSnapshot(): ActivityEntry[] {
  if (cachedSnapshot == null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): ActivityEntry[] {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeEntries(next: ActivityEntry[]) {
  cachedSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Activity log still works for this session even if it can't persist.
  }
  listeners.forEach((l) => l());
}

export function useActivityLog() {
  const entries = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const logActivity = React.useCallback((entry: Omit<ActivityEntry, "id" | "at">) => {
    const next = [{ id: newId(), at: new Date().toISOString(), ...entry }, ...getSnapshot()].slice(0, MAX_ENTRIES);
    writeEntries(next);
  }, []);

  return { entries, logActivity };
}
