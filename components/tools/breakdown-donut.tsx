"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface BreakdownSlice {
  label: string;
  value: number;
  color: string;
}

/** Groww-style invested-vs-returns donut, reused by the standalone calculators. */
export function BreakdownDonut({
  title,
  centerLabel,
  centerValue,
  slices,
}: {
  title: string;
  /** Skips the center readout when omitted — used where the slices don't add up to one meaningful total (e.g. SWP). */
  centerLabel?: string;
  centerValue?: number;
  slices: BreakdownSlice[];
}) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative shrink-0" style={{ width: 190, height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {slices.map((s) => (
                    <Cell key={s.label} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    return (
                      <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-popover-foreground">{p.name}</p>
                        <p className="mt-0.5 font-mono tabular-nums text-popover-foreground">
                          {formatINR(p.value as number)}
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {centerValue != null && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground">{centerLabel}</p>
                <p className="font-mono text-lg font-semibold tabular-nums tracking-tight">
                  {formatINRCompact(centerValue)}
                </p>
              </div>
            )}
          </div>

          <div className="grid w-full flex-1 gap-3">
            {slices.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-medium tabular-nums">{formatINR(s.value)}</span>
                  <span className="w-12 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {formatPercent(total > 0 ? (s.value / total) * 100 : 0, 0)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
