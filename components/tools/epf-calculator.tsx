"use client";

import * as React from "react";

import { computeEpf } from "@/lib/calculators/epf-calc";
import { computeEps } from "@/lib/calculators/eps-calc";
import { formatINR } from "@/lib/format";
import { buildHikeSchedule, previewCurvePath, type SalaryCurveType } from "@/lib/calculators/salary-curve";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

const CURVE_OPTIONS: { value: SalaryCurveType; label: string; rateLabel: string; note: string }[] = [
  {
    value: "steady",
    label: "Steady (fixed % every year)",
    rateLabel: "Hike every work anniversary",
    note: "A constant yearly raise — typical of government or public-sector increments.",
  },
  {
    value: "scurve",
    label: "Fast growth, then plateau (S-curve)",
    rateLabel: "Early-career hike",
    note: "Rapid raises in the early/mid years that taper toward inflation-level increments once growth slows — the classic corporate promotion track.",
  },
  {
    value: "step",
    label: "Promotion jumps (step)",
    rateLabel: "Jump size on promotion",
    note: "Basic stays flat between promotions, then jumps sharply the year you're promoted.",
  },
  {
    value: "peak",
    label: "Peak, then decline",
    rateLabel: "Growth before peak",
    note: "Earnings grow to a peak, then taper off — common in commission-heavy, sales, or physically demanding roles winding down toward retirement.",
  },
];

/** A tiny inline chart of a curve's shape, drawn from lib/salary-curve.ts's fixed preview parameters — same for every render, so it's computed once at module scope rather than per-render. */
const CURVE_PREVIEWS: Record<SalaryCurveType, string> = Object.fromEntries(
  CURVE_OPTIONS.map((c) => {
    const points = previewCurvePath(c.value);
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const w = 44;
    const h = 16;
    const d = points
      .map((v, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return [c.value, d];
  })
) as Record<SalaryCurveType, string>;

function CurveSparkline({ type }: { type: SalaryCurveType }) {
  return (
    <svg width={44} height={16} viewBox="0 0 44 16" className="shrink-0 text-muted-foreground" aria-hidden="true">
      <path d={CURVE_PREVIEWS[type]} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface EpfCalculatorInitial {
  basicSalary?: number;
  employeePct?: number;
  employerPct?: number;
  ratePct?: number;
  currentAge?: number;
  jobStartAge?: number;
  retirementAge?: number;
  existingBalance?: number;
}

export function EpfCalculator({ initial }: { initial?: EpfCalculatorInitial }) {
  const [basicSalary, setBasicSalary] = React.useState(initial?.basicSalary ?? 30000);
  const [employeePct, setEmployeePct] = React.useState(initial?.employeePct ?? 12);
  const [employerPct, setEmployerPct] = React.useState(initial?.employerPct ?? 12);
  const [ratePct, setRatePct] = React.useState(initial?.ratePct ?? 8.25);
  const [currentAge, setCurrentAge] = React.useState(initial?.currentAge ?? 30);
  const [jobStartAge, setJobStartAge] = React.useState(initial?.jobStartAge ?? 25);
  const [retirementAge, setRetirementAge] = React.useState(initial?.retirementAge ?? 58);
  const [existingBalance, setExistingBalance] = React.useState(initial?.existingBalance ?? 0);
  const [mode, setMode] = React.useState<"simple" | "advanced">(initial?.jobStartAge != null ? "advanced" : "simple");
  const [hikeEnabled, setHikeEnabled] = React.useState(false);
  const [curveType, setCurveType] = React.useState<SalaryCurveType>("steady");
  const [hikePct, setHikePct] = React.useState(8);
  const [plateauYears, setPlateauYears] = React.useState(10);
  const [stepIntervalYears, setStepIntervalYears] = React.useState(3);
  const [peakYears, setPeakYears] = React.useState(15);

  // A job can't have started after "now" — derived rather than synced back
  // into state, so dragging current age down below a previously-set job
  // start age just clamps the effective value (e.g. started at 27,
  // currently 27 is valid; starting "in the future" isn't) without a
  // setState-in-effect round trip, and the original value comes back if
  // current age is raised again.
  const effectiveJobStartAge = Math.min(jobStartAge, currentAge);

  const years = Math.max(1, retirementAge - currentAge);
  const curve = CURVE_OPTIONS.find((c) => c.value === curveType) ?? CURVE_OPTIONS[0];
  // Advanced-only settings (hike, job start age / EPS) stay in state across
  // a tab switch — so flipping back to Advanced remembers what you had —
  // but only actually affect the projection while Advanced is selected, so
  // Simple always shows a plain flat-salary corpus regardless of what was
  // left configured on the Advanced tab.
  const effectiveHikeEnabled = mode === "advanced" && hikeEnabled;
  const hikeSchedule = React.useMemo(
    () =>
      effectiveHikeEnabled
        ? buildHikeSchedule({ type: curveType, rate: hikePct, plateauYears, stepIntervalYears, peakYears }, years)
        : [],
    [effectiveHikeEnabled, curveType, hikePct, plateauYears, stepIntervalYears, peakYears, years]
  );

  const epf = React.useMemo(
    () => computeEpf(basicSalary, employeePct, employerPct, ratePct, years, existingBalance, hikeSchedule),
    [basicSalary, employeePct, employerPct, ratePct, years, existingBalance, hikeSchedule]
  );
  // Pensionable salary is meant to reflect what you're earning near
  // retirement, not today — so once hikes are modeled, EPS uses the grown
  // (still capped) figure instead of today's basic. With hikes off,
  // finalBasicSalary === basicSalary, so this is a no-op either way.
  const eps = React.useMemo(
    () => computeEps(epf.finalBasicSalary, effectiveJobStartAge, retirementAge),
    [epf.finalBasicSalary, effectiveJobStartAge, retirementAge]
  );

  const retirementNote =
    retirementAge < 58
      ? `Early retirement — EPS reduces the pension 4% for every year short of 58.`
      : retirementAge > 58
        ? `Deferred past 58 — EPS adds 4% to the pension for every year you wait, up to 60.`
        : `EPF's normal retirement age — no early/deferred adjustment.`;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your EPF</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "simple" | "advanced")}>
            <TabsList className="w-full">
              <TabsTrigger value="simple" className="flex-1">
                Simple
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">
                Advanced
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <SliderField id="epf-basic" label="Monthly basic + DA" value={basicSalary} onChange={setBasicSalary} min={5000} max={300000} step={1000} prefix="₹" />
          <SliderField id="epf-employee" label="Your contribution" value={employeePct} onChange={setEmployeePct} min={1} max={12} step={0.5} suffix="%" />
          <SliderField id="epf-employer" label="Employer's total PF contribution" value={employerPct} onChange={setEmployerPct} min={1} max={12} step={0.01} suffix="%" />
          <SliderField id="epf-rate" label="EPF interest rate" value={ratePct} onChange={setRatePct} min={5} max={12} step={0.05} suffix="%" />

          {mode === "advanced" && (
            <div className="grid gap-2.5 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="epf-hike-toggle" className="text-sm font-normal">
                  Annual salary hike
                </Label>
                <Switch id="epf-hike-toggle" checked={hikeEnabled} onCheckedChange={setHikeEnabled} />
              </div>
              {hikeEnabled && (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="epf-curve-type" className="text-xs font-normal text-muted-foreground">
                      Career trajectory
                    </Label>
                    <Select value={curveType} onValueChange={(v) => setCurveType(v as SalaryCurveType)}>
                      <SelectTrigger id="epf-curve-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURVE_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <CurveSparkline type={c.value} />
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <SliderField
                    id="epf-hike-percent"
                    label={curve.rateLabel}
                    value={hikePct}
                    onChange={setHikePct}
                    min={1}
                    max={curveType === "step" ? 40 : 25}
                    step={1}
                    suffix="%"
                    size="sm"
                  />
                  {curveType === "scurve" && (
                    <SliderField
                      id="epf-plateau-years"
                      label="Years until growth slows"
                      value={plateauYears}
                      onChange={setPlateauYears}
                      min={3}
                      max={Math.max(3, Math.round(years))}
                      step={1}
                      suffix="yrs"
                      size="sm"
                    />
                  )}
                  {curveType === "step" && (
                    <SliderField
                      id="epf-step-interval"
                      label="Years between promotions"
                      value={stepIntervalYears}
                      onChange={setStepIntervalYears}
                      min={1}
                      max={6}
                      step={1}
                      suffix="yrs"
                      size="sm"
                    />
                  )}
                  {curveType === "peak" && (
                    <SliderField
                      id="epf-peak-years"
                      label="Years until peak earnings"
                      value={peakYears}
                      onChange={setPeakYears}
                      min={3}
                      max={Math.max(3, Math.round(years))}
                      step={1}
                      suffix="yrs"
                      size="sm"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {curve.note} Your basic (and contribution) grows with it — since EPF is a percentage of basic
                    salary, a raise means a bigger EPF contribution too. By retirement your basic would reach{" "}
                    {formatINR(epf.finalBasicSalary)}/mo.
                  </p>
                </>
              )}
            </div>
          )}
          <SliderField id="epf-age" label="Your current age" value={currentAge} onChange={setCurrentAge} min={18} max={59} step={1} suffix="yrs" />
          <div className="grid gap-1.5">
            <SliderField id="epf-retirement-age" label="Retirement age" value={retirementAge} onChange={setRetirementAge} min={50} max={60} step={1} suffix="yrs" />
            <p className="text-xs text-muted-foreground">
              → {years} {years === 1 ? "year" : "years"} to grow. {retirementNote}
            </p>
          </div>
          {mode === "advanced" && (
            <div className="grid gap-1.5">
              <SliderField id="epf-job-start" label="Age when you started this job" value={effectiveJobStartAge} onChange={setJobStartAge} min={18} max={currentAge} step={1} suffix="yrs" />
              <p className="text-xs text-muted-foreground">
                → {eps.pensionableServiceYears} {eps.pensionableServiceYears === 1 ? "year" : "years"} of pensionable
                service (used for the EPS pension estimate below, not the EPF corpus).
              </p>
            </div>
          )}
          <SliderField
            id="epf-existing"
            label="Current EPF balance (optional)"
            value={existingBalance}
            onChange={setExistingBalance}
            min={0}
            max={5000000}
            step={10000}
            prefix="₹"
          />
          <p className="text-xs text-muted-foreground">
            From your UAN passbook, if you already have one — the projection grows from there instead of ₹0. By law,
            8.33% of the employer&apos;s contribution is diverted to your pension scheme (EPS) instead of this corpus —
            but that diversion is capped at 8.33% of ₹15,000, not 8.33% of your actual basic. So above a ₹15,000
            basic, more of the employer&apos;s share lands in EPF than the textbook &quot;3.67%&quot; figure suggests — the exact
            split above is worked out for you from your basic salary. Check the current EPFO-declared rate; it
            changes yearly.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Your EPF — one-time payout</CardTitle>
            <CardDescription>What you&apos;ll get as a lump sum when you withdraw.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {effectiveHikeEnabled ? "Combined monthly, now → at retirement" : "Combined monthly"}
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">
                {formatINR(epf.monthlyContribution)}
                {effectiveHikeEnabled && <> → {formatINR(epf.finalMonthlyContribution)}</>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Interest earned</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(epf.totalInterest)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Maturity value</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(epf.maturityValue)}</p>
            </div>
          </CardContent>
        </Card>

        <BreakdownDonut
          title="Maturity breakdown"
          centerLabel="Maturity value"
          centerValue={epf.maturityValue}
          slices={[
            ...(existingBalance > 0
              ? [
                  { label: "Already saved", value: existingBalance, color: "var(--color-chart-4)" },
                  { label: "New contributions", value: epf.totalInvested - existingBalance, color: "var(--color-chart-3)" },
                ]
              : [{ label: "Contributed", value: epf.totalInvested, color: "var(--color-chart-3)" }]),
            { label: "Interest earned", value: epf.totalInterest, color: "var(--color-chart-1)" },
          ]}
        />

        {mode === "advanced" && (
          <Card>
            <CardHeader>
              <CardTitle>Your EPS — monthly pension</CardTitle>
              <CardDescription>
                What you&apos;ll get every month after retirement, separate from the EPF lump sum above.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pensionable salary</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(eps.pensionableSalary)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pensionable service</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{eps.pensionableServiceYears} yrs</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Monthly pension</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(eps.monthlyPension)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                EPS pension is a fixed formula — (pensionable salary × pensionable service) ÷ 70 — not a projection of
                compounding growth, so it doesn&apos;t depend on your contribution rate or interest rate above.
                Pensionable salary is capped at ₹15,000/month by default, the statutory cap for most members (EPFO&apos;s
                2023 &quot;higher pension&quot; option is a separate opt-in that isn&apos;t modeled here).
                {effectiveHikeEnabled && " With a salary hike modeled, this uses your basic near retirement, not today's — still subject to the same cap."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
