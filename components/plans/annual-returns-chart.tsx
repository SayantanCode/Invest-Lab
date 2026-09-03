"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

import type { YearlyReturn } from "@/lib/calculators/yearly-returns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className={cn("font-mono tabular-nums", value >= 0 ? "text-positive" : "text-negative")}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(2)}%
      </p>
    </div>
  );
}

export function AnnualReturnsChart({ years }: { years: YearlyReturn[] }) {
  const withReturns = years.filter((y): y is YearlyReturn & { returnPct: number } => y.returnPct != null);
  const data = withReturns.map((y) => ({ year: y.year, returnPct: y.returnPct }));
  const best = withReturns.length ? withReturns.reduce((a, b) => (b.returnPct > a.returnPct ? b : a)) : null;
  const worst = withReturns.length ? withReturns.reduce((a, b) => (b.returnPct < a.returnPct ? b : a)) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual returns (%)</CardTitle>
        <CardDescription>Year-over-year change in portfolio value, from the expected-scenario ledger.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Not enough history yet for a yearly breakdown.</p>
        ) : (
          <>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
                  <Bar dataKey="returnPct" radius={[3, 3, 0, 0]}>
                    {data.map((d) => (
                      <Cell key={d.year} fill={d.returnPct >= 0 ? "var(--color-positive)" : "var(--color-negative)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {best && worst && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Best Year</p>
                  <p className="font-mono text-lg font-semibold tabular-nums text-positive">
                    {best.year} · +{best.returnPct.toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Worst Year</p>
                  <p className={cn("font-mono text-lg font-semibold tabular-nums", worst.returnPct >= 0 ? "text-positive" : "text-negative")}>
                    {worst.year} · {worst.returnPct >= 0 ? "+" : ""}
                    {worst.returnPct.toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
