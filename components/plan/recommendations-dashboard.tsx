"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Pencil, XCircle } from "lucide-react";

import type { Profile } from "@/lib/stores/use-profile-store";
import { useGoalStore } from "@/lib/stores/use-goal-store";
import { inflatedTarget, requiredMonthlySip } from "@/lib/calculators/goal-calc";
import { buildRecommendations, monthlySurplus, type RecommendationStatus } from "@/lib/goals/prioritization";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_META: Record<RecommendationStatus, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  ok: { icon: CheckCircle2, tone: "text-positive", label: "On track" },
  warning: { icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-500", label: "Needs attention" },
  critical: { icon: XCircle, tone: "text-negative", label: "Priority" },
};

export function RecommendationsDashboard({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const { goals } = useGoalStore();

  const goalsMonthlyTotal = React.useMemo(
    () =>
      goals.reduce((sum, goal) => {
        const target = inflatedTarget(goal.targetAmountToday, goal.inflationPct, goal.years);
        return sum + requiredMonthlySip(target, goal.expectedReturnPct, goal.years, goal.existingSavings);
      }, 0),
    [goals]
  );

  const recommendations = React.useMemo(() => buildRecommendations(profile, goalsMonthlyTotal), [profile, goalsMonthlyTotal]);
  const surplus = monthlySurplus(profile);
  const criticalCount = recommendations.filter((r) => r.status === "critical").length;

  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Your monthly surplus, after expenses and EMIs</p>
            <p className={cn("font-mono text-2xl font-semibold tabular-nums", surplus < 0 && "text-negative")}>
              {formatINR(surplus)}/mo
            </p>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <p className="max-w-xs text-right text-xs text-muted-foreground">
                {criticalCount} {criticalCount === 1 ? "item needs" : "items need"} attention before goal investing.
              </p>
            )}
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Pencil className="size-3.5" />
              Edit profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((item) => {
          const meta = STATUS_META[item.status];
          return (
            <Card key={item.key}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
                <span className={cn("flex items-center gap-1 text-xs font-medium", meta.tone)}>
                  <meta.icon className="size-3.5" />
                  {meta.label}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
