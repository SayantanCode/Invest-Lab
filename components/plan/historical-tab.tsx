"use client";

import * as React from "react";
import { AlertTriangle, Loader2, TrendingUp } from "lucide-react";

import type { Plan } from "@/lib/engine";
import {
  addYearsUTC,
  computePortfolioHistoricalWindow,
  deriveRegularNavSeries,
  diffYears,
  firstAvailableDate,
  lastAvailableDate,
  parseISO,
  realValue,
  simulateHistoricalWithProjection,
  simulatePortfolioHistorical,
  toISODate,
  validateAllocations,
} from "@/lib/engine";
import { fetchSchemeNav, type SchemeListItem, type SchemeNavData } from "@/lib/data/mfapi";
import { formatDate } from "@/lib/format";

import { FundSearch } from "@/components/plan/fund-search";
import { HistoricalChart, type HistoricalChartPoint } from "@/components/plan/historical-chart";
import { DirectVsRegularCard } from "@/components/plan/direct-vs-regular-card";
import { SummaryCards } from "@/components/plan/summary-cards";
import { LedgerTable } from "@/components/plan/ledger-table";
import { EventTimeline } from "@/components/plan/event-timeline";
import { PlanTimingField } from "@/components/plan/plan-timing-field";
import { SliderField } from "@/components/plan/slider-field";
import { MultiFundCard } from "@/components/plan/multi-fund-card";
import { PortfolioBreakdownTable } from "@/components/plan/portfolio-breakdown-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HistoricalTab({ plan, onChange }: { plan: Plan; onChange: (plan: Plan) => void }) {
  const [navData, setNavData] = React.useState<SchemeNavData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [directVsRegular, setDirectVsRegular] = React.useState(false);
  const [expenseDelta, setExpenseDelta] = React.useState(0.5);

  const allocations = plan.allocations;
  const isMultiFund = (allocations?.length ?? 0) >= 2;
  const allocationError = isMultiFund
    ? validateAllocations(allocations!, { requireHistoricalScheme: true })
    : null;
  const isPortfolio = isMultiFund && !allocationError;

  const schemeCode = plan.historicalScheme?.schemeCode;

  // --- Single-fund path -----------------------------------------------
  // Clear stale data immediately when the selected fund changes, so a
  // previous fund's chart never lingers while the new one is loading (or
  // after the fund is cleared entirely). Adjusting state while rendering
  // (rather than in the effect below) avoids an extra render pass — see
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [prevSchemeCode, setPrevSchemeCode] = React.useState(schemeCode);
  if (schemeCode !== prevSchemeCode) {
    setPrevSchemeCode(schemeCode);
    setNavData(null);
    setError(null);
  }

  const loading = !isMultiFund && !!schemeCode && !navData && !error;

  React.useEffect(() => {
    if (isMultiFund || !schemeCode) return;
    let cancelled = false;
    fetchSchemeNav(schemeCode)
      .then((data) => {
        if (!cancelled) setNavData(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load NAV history for this fund. Try again in a moment.");
      });
    return () => {
      cancelled = true;
    };
  }, [schemeCode, isMultiFund]);

  function handleSelectFund(scheme: SchemeListItem) {
    const previousStart = plan.startDate;
    onChange({ ...plan, historicalScheme: scheme });

    // Real NAV data always lags "today" by at least a day, so a plan whose
    // start date defaulted to today (the common case, coming from Simple or
    // Advanced) would otherwise replay against zero months of real history.
    // If the current window leaves no meaningful backtest, suggest a sane
    // one instead of quietly showing ₹0 everywhere.
    fetchSchemeNav(scheme.schemeCode)
      .then((data) => {
        const first = firstAvailableDate(data.navs);
        const last = lastAvailableDate(data.navs);
        if (!first || !last) return;
        if (plan.startDate < first || plan.startDate >= last) {
          const tenYearsBack = toISODate(addYearsUTC(parseISO(last), -10));
          const suggestedStart = tenYearsBack > first ? tenYearsBack : first;
          const events = plan.events.map((e) =>
            e.type === "SIP_START" && e.date === previousStart ? { ...e, date: suggestedStart } : e
          );
          onChange({ ...plan, historicalScheme: scheme, startDate: suggestedStart, endDate: last, events });
        }
      })
      .catch(() => {
        // The main effect below will surface the fetch error; nothing more to do here.
      });
  }

  const directResult = React.useMemo(() => {
    if (isMultiFund || !navData) return null;
    return simulateHistoricalWithProjection(plan, navData.navs);
  }, [plan, navData, isMultiFund]);

  const regularResult = React.useMemo(() => {
    if (isMultiFund || !navData || !directVsRegular) return null;
    const regularNavs = deriveRegularNavSeries(navData.navs, expenseDelta);
    return simulateHistoricalWithProjection(plan, regularNavs);
  }, [navData, directVsRegular, expenseDelta, plan, isMultiFund]);

  const firstIso = navData ? firstAvailableDate(navData.navs) : null;
  const lastIso = navData ? lastAvailableDate(navData.navs) : null;
  const startBeforeInception = firstIso != null && plan.startDate < firstIso;

  // --- Multi-fund path --------------------------------------------------
  const [navByAllocationId, setNavByAllocationId] = React.useState<Map<string, SchemeNavData>>(new Map());
  const [portfolioError, setPortfolioError] = React.useState<string | null>(null);
  const allocationKey = isPortfolio
    ? allocations!.map((a) => `${a.id}:${a.historicalScheme!.schemeCode}`).join(",")
    : "";

  const [prevAllocationKey, setPrevAllocationKey] = React.useState(allocationKey);
  if (allocationKey !== prevAllocationKey) {
    setPrevAllocationKey(allocationKey);
    setPortfolioError(null);
  }

  React.useEffect(() => {
    if (!isPortfolio || !allocations) return;
    let cancelled = false;
    Promise.all(
      allocations.map((a) => fetchSchemeNav(a.historicalScheme!.schemeCode).then((data) => [a.id, data] as const))
    )
      .then((entries) => {
        if (!cancelled) setNavByAllocationId(new Map(entries));
      })
      .catch(() => {
        if (!cancelled) setPortfolioError("Couldn't load NAV history for one or more funds. Try again in a moment.");
      });
    return () => {
      cancelled = true;
    };
  }, [allocationKey, isPortfolio, allocations]);

  const portfolioDataReady =
    isPortfolio && !!allocations && allocations.every((a) => navByAllocationId.has(a.id));
  const portfolioLoading = isPortfolio && !portfolioDataReady && !portfolioError;

  // Same problem as the single-fund case, for the same reason: real data
  // always lags "today", so a plan defaulting to "start today" would
  // otherwise replay against zero (or negative) months of overlap across
  // every selected fund. A ref (not state) gates this to once per exact set
  // of funds, so it never fights a start date the user picked deliberately
  // afterward, and never trips the "setState in effect" lint rule either —
  // it's not React state, just effect-scoped bookkeeping.
  const suggestedForKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!portfolioDataReady || !allocations) return;
    if (suggestedForKeyRef.current === allocationKey) return;
    suggestedForKeyRef.current = allocationKey;

    let latestFirst = "";
    let earliestLast = "";
    for (const a of allocations) {
      const navs = navByAllocationId.get(a.id)?.navs ?? [];
      const first = firstAvailableDate(navs);
      const last = lastAvailableDate(navs);
      if (first && (!latestFirst || first > latestFirst)) latestFirst = first;
      if (last && (!earliestLast || last < earliestLast)) earliestLast = last;
    }
    if (!latestFirst || !earliestLast) return;

    if (plan.startDate < latestFirst || plan.startDate >= earliestLast) {
      const tenYearsBack = toISODate(addYearsUTC(parseISO(earliestLast), -10));
      const suggestedStart = tenYearsBack > latestFirst ? tenYearsBack : latestFirst;
      const previousStart = plan.startDate;
      const events = plan.events.map((e) =>
        e.type === "SIP_START" && e.date === previousStart ? { ...e, date: suggestedStart } : e
      );
      onChange({ ...plan, startDate: suggestedStart, endDate: earliestLast, events });
    }
  }, [portfolioDataReady, allocations, navByAllocationId, allocationKey, plan, onChange]);

  const portfolioWindow = React.useMemo(() => {
    if (!portfolioDataReady || !allocations) return null;
    const navMap = new Map(allocations.map((a) => [a.id, navByAllocationId.get(a.id)!.navs]));
    return computePortfolioHistoricalWindow(plan, navMap, allocations);
  }, [portfolioDataReady, allocations, navByAllocationId, plan]);

  const portfolioResult = React.useMemo(() => {
    if (!portfolioWindow || portfolioWindow.fatalError || !allocations) return null;
    const navMap = new Map(allocations.map((a) => [a.id, navByAllocationId.get(a.id)!.navs]));
    return simulatePortfolioHistorical(plan, allocations, navMap, portfolioWindow);
  }, [portfolioWindow, allocations, navByAllocationId, plan]);

  // --- Combined view ------------------------------------------------------
  const activeResult = isPortfolio ? portfolioResult?.overall ?? null : directResult;
  const activeStartDate = isPortfolio && portfolioWindow ? portfolioWindow.startDate : plan.startDate;
  const fundName = isPortfolio ? "your portfolio" : navData?.schemeName ?? "";

  const projectedFromDate = !isPortfolio ? directResult?.projectedFromDate ?? null : null;

  const chartData: HistoricalChartPoint[] = React.useMemo(() => {
    if (!activeResult) return [];
    const start = parseISO(activeStartDate);
    const splitIdx = projectedFromDate ? activeResult.ledger.findIndex((r) => r.date === projectedFromDate) : -1;
    // Include the last real-data point in the projected series too, so the
    // dashed continuation line starts exactly where the solid one ends
    // instead of leaving a visible gap.
    const realBoundaryIdx = splitIdx >= 0 ? splitIdx - 1 : activeResult.ledger.length - 1;
    return activeResult.ledger.map((row, i) => {
      const years = diffYears(start, parseISO(row.date));
      return {
        date: row.date,
        invested: row.totalInvested,
        value: i <= realBoundaryIdx ? row.value : undefined,
        projectedValue: splitIdx >= 0 && i >= realBoundaryIdx ? row.value : undefined,
        real: realValue(row.value, plan.assumptions.inflation, Math.max(years, 0)),
        regularValue: !isPortfolio ? regularResult?.ledger[i]?.value : undefined,
      };
    });
  }, [activeResult, activeStartDate, plan.assumptions.inflation, regularResult, isPortfolio, projectedFromDate]);

  return (
    <>
      <MultiFundCard plan={plan} onChange={onChange} mode="historical" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="flex min-w-0 flex-col gap-5 lg:order-1">
        {!isMultiFund && !plan.historicalScheme && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <TrendingUp className="size-8 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Search for a real mutual fund on the right, and this plan replays against what actually happened to
                it — real NAV, not an assumption.
              </p>
            </CardContent>
          </Card>
        )}
        {(loading || portfolioLoading) && (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading NAV history…
            </CardContent>
          </Card>
        )}
        {(error || portfolioError) && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">{error ?? portfolioError}</CardContent>
          </Card>
        )}
        {isPortfolio && portfolioWindow?.fatalError && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">{portfolioWindow.fatalError}</CardContent>
          </Card>
        )}
        {activeResult && !loading && !portfolioLoading && (
          <>
            <SummaryCards result={activeResult} showInflation />
            <HistoricalChart
              data={chartData}
              fundName={fundName}
              showRegular={!isPortfolio && directVsRegular && !!regularResult}
              isProjected={!isPortfolio && !!directResult?.isProjected}
            />
            {isPortfolio && portfolioResult && <PortfolioBreakdownTable legs={portfolioResult.legs} />}
            <LedgerTable
              ledger={activeResult.ledger}
              legs={portfolioResult?.legs.map((l) => ({ label: l.allocation.label, ledger: l.result.ledger }))}
            />
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:order-2">
        {!isMultiFund && (
          <Card>
            <CardHeader>
              <CardTitle>Fund</CardTitle>
              <CardDescription>Real AMFI-sourced NAV, via a free community API.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FundSearch selected={plan.historicalScheme ?? null} onSelect={handleSelectFund} />
              {navData && firstIso && lastIso && (
                <p className="text-xs text-muted-foreground">
                  Data available {formatDate(firstIso)} – {formatDate(lastIso)}.
                </p>
              )}
              {startBeforeInception && firstIso && (
                <Warning>
                  Your plan starts before this fund&apos;s data begins ({formatDate(firstIso)}) — earlier months use
                  the inception NAV.
                </Warning>
              )}
              {directResult?.isProjected && directResult.projectedFromDate && directResult.projectedReturnPct != null && (
                <Warning>
                  Real data ends {formatDate(lastIso ?? directResult.projectedFromDate)} — from{" "}
                  {formatDate(directResult.projectedFromDate)} onward, this plan is projected using{" "}
                  {fundName || "this fund"}&apos;s own trailing CAGR of {directResult.projectedReturnPct.toFixed(1)}%
                  /yr. Not a guarantee — just its own past, carried forward.
                </Warning>
              )}
            </CardContent>
          </Card>
        )}

        {isPortfolio && portfolioWindow && !portfolioWindow.fatalError && (
          <Card>
            <CardHeader>
              <CardTitle>Backtest window</CardTitle>
              <CardDescription>The stretch where every fund in the portfolio has real data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-xs text-muted-foreground">
                {formatDate(portfolioWindow.startDate)} – {formatDate(portfolioWindow.endDate)}
              </p>
              {portfolioWindow.warnings.map((w) => (
                <Warning key={w}>{w}</Warning>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Plan settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="hist-plan-name">Plan name</Label>
              <Input
                id="hist-plan-name"
                value={plan.name}
                onChange={(e) => onChange({ ...plan, name: e.target.value })}
              />
            </div>
            <PlanTimingField
              startDate={plan.startDate}
              endDate={plan.endDate}
              onChange={(startDate, endDate) => onChange({ ...plan, startDate, endDate })}
            />
            <SliderField
              id="hist-inflation"
              label="Inflation"
              value={plan.assumptions.inflation}
              onChange={(v) => onChange({ ...plan, assumptions: { ...plan.assumptions, inflation: v } })}
              min={0}
              max={15}
              step={0.5}
              suffix="%"
              size="sm"
            />
          </CardContent>
        </Card>

        {!isMultiFund && navData && (
          <DirectVsRegularCard
            enabled={directVsRegular}
            onEnabledChange={setDirectVsRegular}
            expenseDelta={expenseDelta}
            onExpenseDeltaChange={setExpenseDelta}
            directResult={directResult}
            regularResult={regularResult}
          />
        )}

        <EventTimeline
          events={plan.events}
          planStart={plan.startDate}
          planEnd={plan.endDate}
          onChange={(events) => onChange({ ...plan, events })}
        />
      </div>
      </div>
    </>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
      <span>{children}</span>
    </div>
  );
}
