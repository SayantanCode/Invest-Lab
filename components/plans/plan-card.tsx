"use client";

import * as React from "react";
import { Copy, Trash2, Wallet, Target, PiggyBank } from "lucide-react";
import type { SavedPlan, PlanType } from "@/lib/stores/use-plans-store";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { formatDate, formatINRCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlanSparkline } from "@/components/plans/plan-sparkline";

export const PLAN_TYPE_META: Record<PlanType, { label: string; icon: typeof Wallet; chip: string }> = {
  wealth: { label: "Wealth Creation", icon: Wallet, chip: "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" },
  goal: { label: "Goal Based", icon: Target, chip: "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400" },
  retirement: { label: "Retirement", icon: PiggyBank, chip: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" },
};

export function PlanCard({
  saved,
  onOpen,
  onDuplicate,
  onDelete,
  className,
}: {
  saved: SavedPlan;
  onOpen: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  const results = React.useMemo(() => computePlanResults(saved.plan), [saved.plan]);
  const meta = PLAN_TYPE_META[saved.planType];

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardContent className="flex flex-1 flex-col gap-3">
        <button type="button" onClick={onOpen} className="flex flex-1 flex-col gap-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", meta.chip)}>
                <meta.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{saved.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {meta.label} · Updated {formatDate(saved.updatedAt.slice(0, 10))}
                </p>
              </div>
            </div>
          </div>

          <PlanSparkline ledger={results.expected.ledger} />

          <div className="mt-auto grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-2.5">
            <div>
              <p className="text-xs text-muted-foreground">Current value</p>
              <p className="font-mono text-sm font-semibold tabular-nums">{formatINRCompact(results.expected.finalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">XIRR</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-positive">{formatPercent(results.expected.xirrPct)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            {saved.targetAmount ? (
              <div>
                <p className="text-muted-foreground">Target</p>
                <p className="font-mono tabular-nums">{formatINRCompact(saved.targetAmount)}</p>
              </div>
            ) : (
              <div />
            )}
            <div className="text-right">
              <p className="text-muted-foreground">Expected by</p>
              <p className="font-mono tabular-nums">{formatDate(saved.plan.endDate)}</p>
            </div>
          </div>
        </button>

        {(onDuplicate || onDelete) && (
          <div className="flex items-center gap-1.5 border-t pt-2">
            {onDuplicate && (
              <Button variant="ghost" size="sm" onClick={onDuplicate} className="gap-1.5 text-muted-foreground">
                <Copy className="size-3.5" />
                Duplicate
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="ml-auto gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
