// Which plan the dashboard's spotlight card + chart should feature, when the
// user has more than one. Defaults to the most recently updated plan, but a
// pin here overrides that — same useSyncExternalStore + localStorage pattern
// used elsewhere in this app for a persisted preference (see
// use-nudge-preference-store.ts). Stored per-browser, not synced to the
// account, same as other local-only UI preferences.

"use client";

import * as React from "react";

const KEY = "investlab.dashboard-pinned-plan.v1";

let cached: string | null | undefined;
const listeners = new Set<() => void>();

function read(): string | null {
  if (cached === undefined) {
    try {
      cached = window.localStorage.getItem(KEY);
    } catch {
      cached = null;
    }
  }
  return cached;
}

function write(next: string | null) {
  cached = next;
  try {
    if (next == null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, next);
  } catch {
    // Preference just won't survive a reload — not worth failing over.
  }
  listeners.forEach((l) => l());
}

/** Returns [pinnedPlanId, setPinnedPlanId] — pass `null` to go back to auto (most recently updated). */
export function useDashboardPinnedPlan(): [string | null, (id: string | null) => void] {
  const pinned = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null
  );
  return [pinned, write];
}
