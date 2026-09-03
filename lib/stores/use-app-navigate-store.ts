// A tiny pub/sub so something outside app/page.tsx's own tree — right now,
// only the AI chat panel, which is mounted globally in app/layout.tsx and so
// has no prop path down into Home's local `view` state — can still change
// which page is showing. Same fire-and-forget shape as
// lib/use-ai-panel-store.ts's isOpen toggle, just for a richer payload.

"use client";

import * as React from "react";

import type { View } from "@/lib/app-view";

const listeners = new Set<(view: View) => void>();

/** Called from anywhere (e.g. a clickable result in the chat) to switch the main page's view. */
export function navigateApp(view: View) {
  listeners.forEach((l) => l(view));
}

/** Called once from Home to receive navigation requests dispatched via navigateApp. */
export function useAppNavigateListener(onNavigate: (view: View) => void) {
  React.useEffect(() => {
    listeners.add(onNavigate);
    return () => {
      listeners.delete(onNavigate);
    };
  }, [onNavigate]);
}
