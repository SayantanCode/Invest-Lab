"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function PlanSparkline({ ledger }: { ledger: { date: string; value: number }[] }) {
  const gradientId = React.useId().replace(/:/g, "");

  if (ledger.length < 2) return <div className="h-10 w-full" />;

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={ledger} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-chart-1)"
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
