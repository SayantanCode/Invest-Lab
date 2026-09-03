"use client";

import { AlertTriangle, Clock, PlayCircle } from "lucide-react";

import type { Goal } from "@/lib/stores/use-goal-store";
import { scheduleGoals } from "@/lib/goals/goal-schedule";
import { addMonthsUTC, toISODate } from "@/lib/engine";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function monthsFromNowToDate(months: number): string {
  return toISODate(addMonthsUTC(new Date(), months));
}

export function GoalTimeline({
  goals,
  monthlySurplus,
}: {
  goals: Goal[];
  monthlySurplus: number | ((month: number) => number);
}) {
  if (goals.length === 0) return null;

  const surplusToday = typeof monthlySurplus === "function" ? monthlySurplus(0) : monthlySurplus;
  const schedule = scheduleGoals(goals, monthlySurplus);
  const anyDelayed = schedule.some((s) => s.delayedMonths > 0 || !s.feasible);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your goal timeline</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {surplusToday < 0 ? "You're overspending by" : "Max you can invest right now"}
            </span>
            <span
              className={cn("font-mono text-lg font-semibold tabular-nums", surplusToday < 0 && "text-negative")}
            >
              {formatINR(surplusToday)}/mo
            </span>
          </div>
          {surplusToday < 0 && (
            <p className="mt-1 text-xs text-negative">
              None of these goals are reachable until your monthly surplus is positive.
            </p>
          )}
        </div>

        <div className="grid gap-2.5">
          {schedule.map(({ goal, sip, startMonth, completesMonth, delayedMonths, feasible }) => {
            if (sip <= 0) {
              return (
                <div key={goal.id} className="flex items-center gap-2.5 rounded-lg border p-3 text-sm">
                  <PlayCircle className="size-4 shrink-0 text-positive" />
                  <span className="font-medium">{goal.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Already on track — no SIP needed</span>
                </div>
              );
            }
            if (!feasible) {
              return (
                <div key={goal.id} className="grid gap-1 rounded-lg border border-destructive/30 p-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="size-4 shrink-0 text-negative" />
                    <span className="font-medium">{goal.name}</span>
                    <span className="ml-auto font-mono tabular-nums text-negative">{formatINR(sip)}/mo needed</span>
                  </div>
                  <p className="pl-6.5 text-xs text-muted-foreground">
                    Doesn&apos;t fit within a 50-year outlook at your current surplus — even after every other goal
                    completes. Trim the target, stretch the timeline, or raise your surplus.
                  </p>
                </div>
              );
            }
            return (
              <div key={goal.id} className="grid gap-1 rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2.5">
                  {delayedMonths > 0 ? (
                    <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
                  ) : (
                    <PlayCircle className="size-4 shrink-0 text-positive" />
                  )}
                  <span className="font-medium">{goal.name}</span>
                  <span className="ml-auto font-mono tabular-nums text-primary">{formatINR(sip)}/mo</span>
                </div>
                <p className="pl-6.5 text-xs text-muted-foreground">
                  {delayedMonths > 0 ? (
                    <>
                      Starts {formatDate(monthsFromNowToDate(startMonth))} — waits {delayedMonths}{" "}
                      {delayedMonths === 1 ? "month" : "months"} for capacity to free up · completes{" "}
                      {formatDate(monthsFromNowToDate(completesMonth))}
                    </>
                  ) : (
                    <>Starts now · completes {formatDate(monthsFromNowToDate(completesMonth))}</>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {anyDelayed && (
          <p className="text-xs text-muted-foreground">
            Goals are ordered soonest-need-first — a shorter-horizon goal gets priority since it has less time to
            make up for a late start. This is one reasonable order, not the only one; stretching a goal&apos;s own
            timeline changes this schedule.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
