// Whether the AI assistant panel is open — the single toggle now that it's
// reached only from one header button, no floating/draggable state to track.
// In-memory only, no reason for a reload to reopen it.

"use client";

import * as React from "react";

let isOpen = false;
const listeners = new Set<() => void>();

export function useAiPanelOpen(): [boolean, (open: boolean) => void] {
  const open = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => isOpen,
    () => false
  );
  const setOpen = React.useCallback((next: boolean) => {
    isOpen = next;
    listeners.forEach((l) => l());
  }, []);
  return [open, setOpen];
}

export function openAiPanel() {
  isOpen = true;
  listeners.forEach((l) => l());
}
