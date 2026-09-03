"use client";

import * as React from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { View } from "@/app/page";
import { simulatePortfolioForecast } from "@/lib/engine";
import { computePlanResults, isPortfolioPlan } from "@/lib/goals/compute-plan-results";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SLICE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

interface FundBucket {
  label: string;
  value: number;
  contributors: { planId: string; planName: string }[];
}

function buildBuckets(plans: ReturnType<typeof useSavedPlansStore>["plans"]): FundBucket[] {
  const map = new Map<string, FundBucket>();

  function add(label: string, value: number, planId: string, planName: string) {
    if (value <= 0) return;
    const existing = map.get(label);
    if (existing) {
      existing.value += value;
      if (!existing.contributors.some((c) => c.planId === planId)) {
        existing.contributors.push({ planId, planName });
      }
    } else {
      map.set(label, { label, value, contributors: [{ planId, planName }] });
    }
  }

  for (const saved of plans) {
    const plan = saved.plan;
    if (isPortfolioPlan(plan) && plan.allocations) {
      const legs = simulatePortfolioForecast(plan, "expected", plan.allocations).legs;
      for (const leg of legs) {
        add(leg.allocation.label, leg.result.finalValue, saved.id, saved.name);
      }
    } else {
      const finalValue = computePlanResults(plan).expected.finalValue;
      const label = plan.historicalScheme?.schemeName ?? `${saved.name} (assumption only)`;
      add(label, finalValue, saved.id, saved.name);
    }
  }

  return [...map.values()].sort((a, b) => b.value - a.value);
}

export function PortfolioAnalyzer({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { plans } = useSavedPlansStore();
  const buckets = React.useMemo(() => buildBuckets(plans), [plans]);
  const total = buckets.reduce((sum, b) => sum + b.value, 0);

  if (buckets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <PieChartIcon className="size-6 text-muted-foreground" />
          </span>
          <div className="grid gap-1">
            <p className="font-medium">Nothing to analyze yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add fund names to your plans — either backtest against a real scheme in Historical mode, or split a
              plan across multiple funds — and they&apos;ll show up here as tracked exposure.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topShare = total > 0 ? (buckets[0].value / total) * 100 : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Fund breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead>From</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buckets.map((b, i) => (
                  <TableRow key={b.label}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                        />
                        {b.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(b.value)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatPercent(total > 0 ? (b.value / total) * 100 : 0, 1)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {b.contributors.map((c) => (
                          <Badge
                            key={c.planId}
                            variant="secondary"
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => onNavigate({ kind: "plan", id: c.planId })}
                          >
                            {c.planName}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Total tracked exposure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{formatINRCompact(total)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Top holding, <span className="font-medium text-foreground">{buckets[0].label}</span>, is{" "}
              <span className="font-medium text-foreground">{formatPercent(topShare, 1)}</span> of what you track here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exposure by fund</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={buckets} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {buckets.map((b, i) => (
                      <Cell key={b.label} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="var(--color-card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0];
                      return (
                        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-medium text-popover-foreground">{p.name}</p>
                          <p className="mt-0.5 font-mono tabular-nums text-popover-foreground">{formatINR(p.value as number)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
