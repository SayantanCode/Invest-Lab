// A compact real-data readout shown the moment a fund is picked — whichever
// mode the plan is in. Choosing a fund is the same decision either way
// ("is this one worth putting in the portfolio?"), so it deserves the same
// real track record whether the plan will run on an assumption or a backtest.

"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { fetchSchemeNav } from "@/lib/data/mfapi";
import { firstAvailableDate, trailingCAGR, type NavPoint } from "@/lib/engine";
import { formatDate } from "@/lib/format";

export function FundDataPreview({ schemeCode }: { schemeCode: number }) {
  const [navs, setNavs] = React.useState<NavPoint[] | null>(null);
  const [error, setError] = React.useState(false);

  // Clear stale data the instant the scheme changes, so one fund's sparkline
  // never lingers under a different fund's row while the new one loads.
  // Adjusting state while rendering (rather than in the effect below) avoids
  // an extra render pass — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevSchemeCode, setPrevSchemeCode] = React.useState(schemeCode);
  if (schemeCode !== prevSchemeCode) {
    setPrevSchemeCode(schemeCode);
    setNavs(null);
    setError(false);
  }

  React.useEffect(() => {
    let cancelled = false;
    fetchSchemeNav(schemeCode)
      .then((data) => {
        if (!cancelled) setNavs(data.navs);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [schemeCode]);

  if (error) return <p className="text-xs text-destructive">Couldn&apos;t load this fund&apos;s data.</p>;

  if (!navs) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading real data…
      </p>
    );
  }

  const first = firstAvailableDate(navs);
  const cagr = trailingCAGR(navs, 10);
  const latestNav = navs[navs.length - 1]?.nav;
  // Downsample for a light sparkline — a decade of daily NAV is thousands of
  // points, and this only needs to show the shape.
  const sparkStep = Math.max(1, Math.ceil(navs.length / 60));
  const sparkData = navs.filter((_, i) => i % sparkStep === 0);

  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fund-spark-${schemeCode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="nav"
              stroke="var(--color-chart-1)"
              strokeWidth={1.5}
              fill={`url(#fund-spark-${schemeCode})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        {latestNav != null && <span className="font-mono tabular-nums text-foreground">₹{latestNav.toFixed(2)}</span>}
        {cagr != null && (
          <>
            {" · "}
            <span className="font-medium text-foreground">{cagr.toFixed(1)}%/yr</span> trailing
          </>
        )}
        {first && <> · since {formatDate(first)}</>}
      </p>
    </div>
  );
}
