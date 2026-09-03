"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { readLocalPlansForImport, refreshRemotePlans } from "@/lib/stores/use-plans-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PROMPTED_KEY = "investlab.import-prompted.v1";

function markPrompted() {
  try {
    window.localStorage.setItem(PROMPTED_KEY, "1");
  } catch {
    // Best-effort — worst case the prompt shows again next sign-in.
  }
}

export function ImportPrompt() {
  const { status } = useSession();
  const [open, setOpen] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [importing, setImporting] = React.useState(false);

  // Detected during render (not an effect) — mirrors the prevPlanId reset
  // pattern in plan-detail.tsx: compare the hook value against its own
  // previous value in state, react to the transition inline.
  const [prevStatus, setPrevStatus] = React.useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    const justSignedIn = status === "authenticated" && prevStatus !== "authenticated";
    if (justSignedIn) {
      let prompted = false;
      try {
        prompted = window.localStorage.getItem(PROMPTED_KEY) === "1";
      } catch {
        // Assume not prompted if we can't check.
      }
      if (!prompted) {
        const local = readLocalPlansForImport();
        if (local.length === 0) {
          markPrompted();
        } else {
          setCount(local.length);
          setOpen(true);
        }
      }
    }
  }

  function handleSkip() {
    markPrompted();
    setOpen(false);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const local = readLocalPlansForImport();
      const res = await fetch("/api/plans/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans: local }),
      });
      if (!res.ok) throw new Error("Import failed");
      refreshRemotePlans();
      toast.success(`Imported ${local.length} plan${local.length === 1 ? "" : "s"}`);
      markPrompted();
      setOpen(false);
    } catch {
      toast.error("Couldn't import your local plans right now — your data is untouched, try again later.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && handleSkip()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Import your local plans?</AlertDialogTitle>
          <AlertDialogDescription>
            You have {count} plan{count === 1 ? "" : "s"} saved in this browser from before signing in. Import{" "}
            {count === 1 ? "it" : "them"} into your account so {count === 1 ? "it's" : "they're"} here on every
            device — your local copy stays put either way.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkip} disabled={importing}>
            Not now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleImport} disabled={importing}>
            {importing ? "Importing…" : `Import ${count === 1 ? "plan" : "plans"}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
