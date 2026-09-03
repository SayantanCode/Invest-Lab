"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSavedPlansStore, type SavedPlan } from "@/lib/stores/use-plans-store";
import type { View } from "@/app/page";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { PlanCard } from "@/components/plans/plan-card";

export function MyPlans({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { plans, deletePlan, duplicatePlan } = useSavedPlansStore();
  const [deleteTarget, setDeleteTarget] = React.useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlan(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error("Couldn't delete this plan — check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handleDuplicate(id: string) {
    duplicatePlan(id).catch(() => {
      toast.error("Couldn't duplicate this plan — check your connection and try again.");
    });
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            Nothing saved yet. Create a plan and see exactly where it takes you — SIPs, lumpsums, withdrawals, real
            funds, all in one place.
          </p>
          <Button onClick={() => onNavigate({ kind: "create-plan" })} className="gap-1.5">
            <Plus className="size-3.5" />
            New plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((saved) => (
        <PlanCard
          key={saved.id}
          saved={saved}
          onOpen={() => onNavigate({ kind: "plan", id: saved.id })}
          onDuplicate={() => handleDuplicate(saved.id)}
          onDelete={() => setDeleteTarget(saved)}
        />
      ))}

      <button
        type="button"
        onClick={() => onNavigate({ kind: "create-plan" })}
        className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-5" />
        <span className="text-sm font-medium">New plan</span>
      </button>

      <AlertDialog open={deleteTarget != null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the plan and its full ledger — this can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
