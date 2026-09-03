"use client";

import * as React from "react";
import { useNudgesEnabled } from "@/lib/stores/use-nudge-preference-store";

/**
 * Fires `onStuck` at most once per mount when the user has sat idle for
 * `timeoutMs` while `active` is true — no tracking, nothing persisted or
 * sent anywhere, just a plain timer reset on real mouse/keyboard/scroll
 * activity. Meant for a single honest signal ("idle on an empty screen"),
 * not a general-purpose analytics hook. Respects the user's "Show helpful
 * nudges" preference (Settings) — off means this never schedules anything.
 */
export function useStuckNudge(active: boolean, timeoutMs: number, onStuck: () => void) {
  const [nudgesEnabled] = useNudgesEnabled();
  const onStuckRef = React.useRef(onStuck);
  React.useEffect(() => {
    onStuckRef.current = onStuck;
  }, [onStuck]);

  React.useEffect(() => {
    if (!active || !nudgesEnabled) return;

    let timer: ReturnType<typeof setTimeout>;
    let fired = false;

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!fired) {
          fired = true;
          onStuckRef.current();
        }
      }, timeoutMs);
    }

    function onActivity() {
      if (fired) return;
      schedule();
    }

    schedule();
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity, true);
    };
  }, [active, timeoutMs, nudgesEnabled]);
}
