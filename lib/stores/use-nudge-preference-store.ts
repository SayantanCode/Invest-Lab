// Whether the "stuck" nudges (lib/use-stuck-nudge.ts) are allowed to fire at
// all — same useSyncExternalStore + localStorage pattern used elsewhere in
// this app for a persisted boolean preference. A plain boolean, so none of
// the object-identity/getSnapshot-stability pitfalls a richer stored value
// (e.g. a position) can run into apply here.

"use client";

import * as React from "react";

const KEY = "investlab.nudges-enabled.v1";

let cached: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (cached == null) {
    try {
      const raw = window.localStorage.getItem(KEY);
      cached = raw == null ? true : raw === "true";
    } catch {
      cached = true;
    }
  }
  return cached;
}

function write(next: boolean) {
  cached = next;
  try {
    window.localStorage.setItem(KEY, String(next));
  } catch {
    // Preference just won't survive a reload — not worth failing over.
  }
  listeners.forEach((l) => l());
}

export function useNudgesEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => true
  );
  return [enabled, write];
}

/** Non-hook read for use outside React (e.g. a plain function component check before scheduling a timer). */
export function nudgesEnabled(): boolean {
  return read();
}
