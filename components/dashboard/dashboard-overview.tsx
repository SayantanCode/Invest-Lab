"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Wallet, TrendingUp, Landmark, LineChart, Target, GitCompare, Calculator, Banknote, AlertTriangle, ArrowRight, Rocket } from "lucide-react";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { useGoalStore } from "@/lib/stores/use-goal-store";
import { useProfileStore } from "@/lib/stores/use-profile-store";
import { useOnboardingStore } from "@/lib/stores/use-onboarding-store";
import { useStuckNudge } from "@/lib/stores/use-stuck-nudge";
import { useDashboardPinnedPlan } from "@/lib/stores/use-dashboard-plan-store";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { buildChartData } from "@/lib/goals/build-chart-data";
import { formatINR, formatINRCompact, formatDate, formatPercent } from "@/lib/format";
import type { View } from "@/app/page";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanCard, PLAN_TYPE_META } from "@/components/plans/plan-card";
import { ValueChart } from "@/components/plan/value-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { MarketSnapshot } from "@/components/dashboard/market-snapshot";

const STAT_CHIPS = {
  invested: "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  corpus: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  real: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  plans: "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
};

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  chip,
  onClick,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", chip)}>
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-mono text-lg font-semibold tabular-nums tracking-tight">{value}</p>
        <p className={cn("truncate text-xs text-muted-foreground", onClick && "group-hover:text-primary")}>{caption}</p>
      </div>
    </>
  );

  return (
    <Card className={cn("gap-1.5 py-4", onClick && "group transition-colors hover:border-primary/50")}>
      <CardContent className="px-4">
        {onClick ? (
          <button type="button" onClick={onClick} className="flex w-full items-start gap-3 text-left">
            {body}
          </button>
        ) : (
          <div className="flex items-start gap-3">{body}</div>
        )}
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS: { label: string; description: string; icon: React.ComponentType<{ className?: string }>; chip: string; view: View }[] = [
  { label: "Goal Planner", description: "Plan for your goals", icon: Target, chip: STAT_CHIPS.invested, view: { kind: "goals" } },
  { label: "Scenario Lab", description: "Compare different plans", icon: GitCompare, chip: STAT_CHIPS.corpus, view: { kind: "compare" } },
  { label: "SIP Calculator", description: "Plan your SIP", icon: Calculator, chip: STAT_CHIPS.real, view: { kind: "tools-sip" } },
  { label: "Lumpsum Calculator", description: "One-time investment", icon: Banknote, chip: STAT_CHIPS.plans, view: { kind: "tools-lumpsum" } },
];

export function DashboardOverview({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { plans } = useSavedPlansStore();
  const { goals } = useGoalStore();
  const { profile } = useProfileStore();
  const { completed: onboardingCompleted } = useOnboardingStore();
  const [welcomeDismissed, setWelcomeDismissed] = React.useState(false);

  const isNewUser = plans.length === 0 && goals.length === 0 && !profile;
  const showWelcome = !onboardingCompleted && !welcomeDismissed && isNewUser;

  useStuckNudge(!onboardingCompleted && isNewUser, 40000, () => {
    toast("Still exploring? Let's build your plan together.", {
      action: { label: "Get started", onClick: () => onNavigate({ kind: "onboarding" }) },
      duration: 10000,
    });
  });

  const totals = React.useMemo(() => {
    let invested = 0;
    let value = 0;
    let realValue = 0;
    for (const saved of plans) {
      const results = computePlanResults(saved.plan);
      invested += results.expected.totalInvested;
      value += results.expected.finalValue;
      realValue += results.expected.realFinalValue;
    }
    return { invested, value, realValue };
  }, [plans]);

  const [pinnedPlanId, setPinnedPlanId] = useDashboardPinnedPlan();

  // Defaults to whichever plan was touched most recently — matches the
  // "here's what's happening" framing of this page — but a pin (set via the
  // switcher below) overrides that until cleared back to "Auto".
  const topPlan = React.useMemo(() => {
    if (plans.length === 0) return null;
    const pinned = pinnedPlanId ? plans.find((p) => p.id === pinnedPlanId) : undefined;
    if (pinned) return pinned;
    return [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }, [plans, pinnedPlanId]);

  const topResults = React.useMemo(() => (topPlan ? computePlanResults(topPlan.plan) : null), [topPlan]);

  const topChartData = React.useMemo(
    () => (topPlan && topResults ? buildChartData(topPlan.plan, topResults) : []),
    [topPlan, topResults]
  );

  const preview = plans.slice(0, 3);
  const progressPct =
    topPlan?.targetAmount && topResults ? Math.min(100, Math.round((topResults.expected.finalValue / topPlan.targetAmount) * 100)) : null;

  return (
    <div className="grid gap-5">
      {showWelcome && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Rocket className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-medium">New here? Let&apos;s build your plan together.</p>
                <p className="text-xs text-muted-foreground">
                  Answer a few simple questions and we&apos;ll do the rest — a real, working plan in under a minute.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setWelcomeDismissed(true)}>
                Not now
              </Button>
              <Button size="sm" onClick={() => onNavigate({ kind: "onboarding" })}>
                Get started
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your plans.</p>
        </div>
        {/* <Button onClick={() => onNavigate({ kind: "create-plan" })} className="gap-1.5">
          <Plus className="size-3.5" />
          New plan
        </Button> */}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Invested"
          value={formatINRCompact(totals.invested)}
          caption={`Across ${plans.length} plan${plans.length === 1 ? "" : "s"}`}
          icon={Wallet}
          chip={STAT_CHIPS.invested}
        />
        <StatCard
          label="Projected Corpus"
          value={formatINRCompact(totals.value)}
          caption={topPlan ? `By ${formatDate(topPlan.plan.endDate)}` : "No plans yet"}
          icon={TrendingUp}
          chip={STAT_CHIPS.corpus}
        />
        <StatCard
          label="Real Value (Today's ₹)"
          value={formatINRCompact(totals.realValue)}
          caption={topPlan ? `After ${topPlan.plan.assumptions.inflation}% inflation` : "—"}
          icon={Landmark}
          chip={STAT_CHIPS.real}
        />
        <StatCard
          label="Total Plans"
          value={String(plans.length)}
          caption="See all plans →"
          icon={LineChart}
          chip={STAT_CHIPS.plans}
          onClick={() => onNavigate({ kind: "plans" })}
        />
      </div>

      {topPlan && topResults && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Card>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate({ kind: "plan", id: topPlan.id })}
                  className="flex min-w-0 items-center gap-2.5 text-left"
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", PLAN_TYPE_META[topPlan.planType].chip)}>
                    {React.createElement(PLAN_TYPE_META[topPlan.planType].icon, { className: "size-4" })}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{topPlan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PLAN_TYPE_META[topPlan.planType].label} · Updated {formatDate(topPlan.updatedAt.slice(0, 10))}
                    </p>
                  </div>
                </button>
                <Button variant="link" size="sm" className="h-auto shrink-0 p-0" onClick={() => onNavigate({ kind: "plans" })}>
                  View all
                </Button>
              </div>

              {plans.length > 1 && (
                <Select value={pinnedPlanId ?? "auto"} onValueChange={(v) => setPinnedPlanId(v === "auto" ? null : v)}>
                  <SelectTrigger size="sm" className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto — most recently updated</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">Current value</p>
                  <p className="font-mono text-sm font-semibold tabular-nums">{formatINRCompact(topResults.expected.finalValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">XIRR</p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-positive">{formatPercent(topResults.expected.xirrPct)}</p>
                </div>
              </div>

              {topPlan.targetAmount ? (
                <div className="grid gap-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progressPct}% of {formatINRCompact(topPlan.targetAmount)} goal
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 rounded-lg border border-dashed p-2.5 text-xs">
                  <p className="text-muted-foreground">No goal set for this plan yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => onNavigate({ kind: "plan", id: topPlan.id })}
                  >
                    Set a goal
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-2.5 text-xs">
                {topPlan.targetAmount ? (
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-mono tabular-nums">{formatINRCompact(topPlan.targetAmount)}</p>
                  </div>
                ) : (
                  <div />
                )}
                <div className="text-right">
                  <p className="text-muted-foreground">Expected by</p>
                  <p className="font-mono tabular-nums">{formatDate(topPlan.plan.endDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pl-0">
              <ValueChart data={topChartData} showInflation={topPlan.plan.assumptions.inflationEnabled} bare height={300} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* <div className="grid gap-3">
        <h3 className="text-sm font-semibold">Your plans</h3>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Wallet className="size-8 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                No plans yet — create your first one and see exactly where it takes you.
              </p>
              <Button onClick={() => onNavigate({ kind: "create-plan" })} className="gap-1.5">
                <Plus className="size-3.5" />
                New plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((saved) => (
              <PlanCard key={saved.id} saved={saved} onOpen={() => onNavigate({ kind: "plan", id: saved.id })} />
            ))}
          </div>
        )}
      </div> */}

      <div className="grid gap-3">
        <h3 className="text-sm font-semibold">Quick actions</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate(action.view)}
              className="flex items-center gap-2.5 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", action.chip)}>
                <action.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{action.label}</p>
                <p className="truncate text-xs text-muted-foreground">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {topPlan && topResults && topPlan.plan.assumptions.inflation > 0 && (
        <Card className="border-l-4 border-l-amber-500 rounded-md p-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <p className="text-sm">
                <span className="font-medium">Reality check —</span> your projected corpus of{" "}
                {formatINR(topResults.expected.finalValue)} in {formatDate(topPlan.plan.endDate)} will have the
                purchasing power of only {formatINR(topResults.expected.realFinalValue)} in today&apos;s money at{" "}
                {topPlan.plan.assumptions.inflation}% inflation.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => onNavigate({ kind: "plan", id: topPlan.id })}
            >
              Explore
              <ArrowRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RecentActivity />
        <MarketSnapshot />
      </div>
    </div>
  );
}
