"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Download, Copy, Trash2, MoreVertical } from "lucide-react";

import type { Plan, PlanEvent } from "@/lib/engine";
import { cagr, diffYears, parseISO, simulatePortfolioForecast } from "@/lib/engine";
import { computePlanResults, isPortfolioPlan } from "@/lib/goals/compute-plan-results";
import { buildChartData } from "@/lib/goals/build-chart-data";
import { useSavedPlansStore, type SavedPlanInput } from "@/lib/stores/use-plans-store";
import { useProfileStore } from "@/lib/stores/use-profile-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { suggestedAllocation } from "@/lib/calculators/asset-allocation";
import { downloadTextFile } from "@/lib/download";
import { formatINR, formatPercent } from "@/lib/format";
import { TYPE_META } from "@/components/plan/event-dialog";
import type { View } from "@/app/page";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { SummaryCards } from "@/components/plan/summary-cards";
import { SliderField } from "@/components/plan/slider-field";
import { ValueChart } from "@/components/plan/value-chart";
import { ScenarioTable } from "@/components/plan/scenario-table";
import { EventTimeline } from "@/components/plan/event-timeline";
import { CashflowTable } from "@/components/plans/cashflow-table";
import { AnnualReturnsChart } from "@/components/plans/annual-returns-chart";
import { TaxSummaryCard } from "@/components/plan/tax-summary-card";
import { AssumptionsCard } from "@/components/plan/assumptions-card";
import { MultiFundCard } from "@/components/plan/multi-fund-card";
import { PortfolioBreakdownTable } from "@/components/plan/portfolio-breakdown-table";
import { RetirementIncomeNote } from "@/components/plan/retirement-income-note";
import { computeYearlyReturns } from "@/lib/calculators/yearly-returns";

const TABS = ["overview", "timeline", "cashflow", "performance", "analysis", "notes"] as const;
type TabKey = (typeof TABS)[number];
const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  timeline: "Timeline",
  cashflow: "Cashflow Table",
  performance: "Performance",
  analysis: "Analysis",
  notes: "Notes",
};

const ALLOCATION_COLORS = { equity: "var(--color-chart-1)", debt: "var(--color-chart-2)", gold: "var(--color-chart-3)" };

function eventLabel(event: PlanEvent): string {
  const title = TYPE_META[event.type].title;
  return "amount" in event && typeof event.amount === "number" ? `${title} (${formatINR(event.amount)})` : title;
}

export function PlanDetail({ planId, onNavigate }: { planId: string; onNavigate: (view: View) => void }) {
  const { plans, updatePlan, deletePlan, duplicatePlan } = useSavedPlansStore();
  const { profile } = useProfileStore();
  const { logActivity } = useActivityLog();
  const saved = plans.find((p) => p.id === planId);
  const plan = saved?.plan;

  const [editing, setEditing] = React.useState(false);
  const [editSnapshot, setEditSnapshot] = React.useState<Plan | null>(null);
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(saved?.name ?? "");
  const [notesDraft, setNotesDraft] = React.useState(saved?.notes ?? "");
  const [whyDraft, setWhyDraft] = React.useState(saved?.whyThisExists ?? "");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [prevPlanId, setPrevPlanId] = React.useState(planId);
  if (prevPlanId !== planId) {
    setPrevPlanId(planId);
    setEditing(false);
    setEditingName(false);
    setNameDraft(saved?.name ?? "");
    setNotesDraft(saved?.notes ?? "");
    setWhyDraft(saved?.whyThisExists ?? "");
  }

  const results = plan ? computePlanResults(plan) : null;
  const allocations = plan?.allocations;
  const portfolioLegs = React.useMemo(() => {
    if (!plan || !isPortfolioPlan(plan) || !allocations) return null;
    return simulatePortfolioForecast(plan, "expected", allocations).legs;
  }, [plan, allocations]);

  const chartData = React.useMemo(() => (plan && results ? buildChartData(plan, results) : []), [plan, results]);

  const yearlyReturns = React.useMemo(
    () => (results ? computeYearlyReturns(results.expected.ledger) : []),
    [results]
  );

  const years = plan ? diffYears(parseISO(plan.startDate), parseISO(plan.endDate)) : 0;
  const allocation = profile && plan ? suggestedAllocation(years, profile.riskTolerance) : null;

  const cagrPct = React.useMemo(() => {
    if (!plan || !results) return null;
    const days = (parseISO(plan.endDate).getTime() - parseISO(plan.startDate).getTime()) / 86_400_000;
    const rate = cagr(results.expected.totalInvested, results.expected.finalValue, days);
    return rate == null ? null : rate * 100;
  }, [plan, results]);

  if (!saved || !plan || !results) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="text-sm text-muted-foreground">This plan doesn&apos;t exist anymore.</p>
          <Button onClick={() => onNavigate({ kind: "plans" })}>Back to My Plans</Button>
        </CardContent>
      </Card>
    );
  }

  const savedId = saved.id;
  const savedName = saved.name;

  // Every autosave on this page (slider edits, name/notes blur) goes through
  // here so a network failure surfaces once instead of being swallowed —
  // the store's remoteUpdatePlan now throws on a non-ok response instead of
  // silently caching nothing, so without this catch a dropped connection
  // would leave the edit invisibly reverted with no explanation.
  function persistPlanUpdate(patch: Partial<SavedPlanInput>) {
    updatePlan(savedId, patch).catch(() => {
      toast.error("Couldn't save that change — check your connection and try again.");
    });
  }

  function setPlan(next: Plan) {
    persistPlanUpdate({ plan: next });
  }

  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed) persistPlanUpdate({ name: trimmed });
    else setNameDraft(savedName);
    setEditingName(false);
  }

  function handleExport() {
    downloadTextFile(`${savedName || "investlab-plan"}.json`, JSON.stringify(plan, null, 2));
    toast.success("Plan exported");
  }

  async function handleDuplicate() {
    let copy;
    try {
      copy = await duplicatePlan(savedId);
    } catch {
      toast.error("Couldn't duplicate this plan — check your connection and try again.");
      return;
    }
    if (copy) {
      logActivity({ kind: "plan_duplicated", planId: copy.id, message: `Plan "${savedName}" duplicated as "${copy.name}"` });
      toast.success(`Duplicated as "${copy.name}"`);
      onNavigate({ kind: "plan", id: copy.id });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePlan(savedId);
      logActivity({ kind: "plan_deleted", message: `Plan "${savedName}" deleted` });
      toast(`Deleted "${savedName}"`);
      onNavigate({ kind: "plans" });
    } catch {
      toast.error("Couldn't delete this plan — check your connection and try again.");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  function handleDoneEditing() {
    if (editSnapshot && JSON.stringify(editSnapshot) !== JSON.stringify(plan)) {
      logActivity({ kind: "plan_updated", planId: savedId, message: `Plan "${savedName}" settings updated` });
    }
    setEditSnapshot(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="grid gap-5">
        <MultiFundCard plan={plan} onChange={setPlan} mode="forecast" />
        <Card>
          <CardHeader>
            <CardTitle>Goal target</CardTitle>
            <CardDescription>Optional — set a ₹ target to track progress toward it on your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <SliderField
              id="plan-target-amount"
              label="Target amount"
              value={saved.targetAmount ?? 0}
              onChange={(v) => persistPlanUpdate({ targetAmount: v > 0 ? v : undefined })}
              min={0}
              max={50_000_000}
              step={50_000}
              prefix="₹"
            />
          </CardContent>
        </Card>
        <AssumptionsCard
          plan={plan}
          onChange={setPlan}
          onNewPlan={() => onNavigate({ kind: "create-plan" })}
          onDone={handleDoneEditing}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onNavigate({ kind: "plans" })} className="text-muted-foreground">
            ← Back to Plans
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditSnapshot(plan);
              setEditing(true);
            }}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            Edit Plan
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} variant="destructive">
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(next) => !deleting && setDeleteDialogOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{savedName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the plan and its full ledger — this can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2">
        {editingName ? (
          <Input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="h-9 max-w-md text-xl font-semibold"
          />
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{saved.name}</h1>
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Rename plan"
            >
              <Pencil className="size-4" />
            </button>
          </>
        )}
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="grid gap-5">
          <SummaryCards result={results.expected} showInflation={plan.assumptions.inflationEnabled} />
          <ValueChart data={chartData} showInflation={plan.assumptions.inflationEnabled} />

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Expected Return</p>
                  <p className="font-mono font-medium tabular-nums">{plan.assumptions.returns.expected}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inflation</p>
                  <p className="font-mono font-medium tabular-nums">
                    {plan.assumptions.inflationEnabled ? `${plan.assumptions.inflation}%` : "Not applied"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Compounding</p>
                  <p className="font-medium">Monthly</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditSnapshot(plan);
                  setEditing(true);
                }}
              >
                View Assumptions
              </Button>
            </CardContent>
          </Card>

          {allocation && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested allocation</CardTitle>
                <CardDescription>
                  Based on your {profile ? profile.riskTolerance : ""} risk tolerance and {Math.round(years)}-year horizon —
                  a guide, not a record of what you actually hold.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div style={{ width: `${allocation.equityPct}%`, background: ALLOCATION_COLORS.equity }} />
                  <div style={{ width: `${allocation.debtPct}%`, background: ALLOCATION_COLORS.debt }} />
                  <div style={{ width: `${allocation.goldPct}%`, background: ALLOCATION_COLORS.gold }} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: ALLOCATION_COLORS.equity }} />
                    Equity {allocation.equityPct}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: ALLOCATION_COLORS.debt }} />
                    Debt {allocation.debtPct}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: ALLOCATION_COLORS.gold }} />
                    Gold {allocation.goldPct}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <EventTimeline
            events={plan.events}
            planStart={plan.startDate}
            planEnd={plan.endDate}
            onChange={(events) => {
              const oldIds = new Set(plan.events.map((e) => e.id));
              const newIds = new Set(events.map((e) => e.id));
              for (const event of events) {
                if (!oldIds.has(event.id)) {
                  logActivity({ kind: "event_added", planId: savedId, message: `${eventLabel(event)} added to "${savedName}"` });
                }
              }
              for (const event of plan.events) {
                if (!newIds.has(event.id)) {
                  logActivity({ kind: "event_removed", planId: savedId, message: `${eventLabel(event)} removed from "${savedName}"` });
                }
              }
              setPlan({ ...plan, events });
            }}
          />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashflowTable ledger={results.expected.ledger} />
        </TabsContent>

        <TabsContent value="performance" className="grid gap-5">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 py-4 sm:w-fit sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">XIRR</p>
                <p className="font-mono text-xl font-semibold tabular-nums">{formatPercent(results.expected.xirrPct)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  CAGR <span className="text-[10px]">(approx.)</span>
                </p>
                <p className="font-mono text-xl font-semibold tabular-nums">{cagrPct == null ? "—" : formatPercent(cagrPct)}</p>
              </div>
            </CardContent>
          </Card>
          <AnnualReturnsChart years={yearlyReturns} />
          <ScenarioTable results={results} showInflation={plan.assumptions.inflationEnabled} />
          {portfolioLegs && <PortfolioBreakdownTable legs={portfolioLegs} />}
          <TaxSummaryCard ledger={results.expected.ledger} />
        </TabsContent>

        <TabsContent value="analysis">
          {saved.planType === "retirement" ? (
            <RetirementIncomeNote
              corpus={results.expected.finalValue}
              accumulationYears={years}
              accumulationInflationPct={plan.assumptions.inflation}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  Nothing plan-type-specific to analyze here yet — this section grows with retirement-style plans.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notes" className="grid gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Notes about this plan</CardTitle>
              <CardDescription>Private to you — saved with this plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="plan-notes" className="sr-only">
                Notes about this plan
              </Label>
              <Textarea
                id="plan-notes"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={() => persistPlanUpdate({ notes: notesDraft })}
                placeholder="Anything you want to remember about this plan..."
                className="min-h-40"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why this plan exists</CardTitle>
              <CardDescription>The reason you started it — useful to re-read when you&apos;re tempted to stop.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="plan-why" className="sr-only">
                Why this plan exists
              </Label>
              <Textarea
                id="plan-why"
                value={whyDraft}
                onChange={(e) => setWhyDraft(e.target.value)}
                onBlur={() => persistPlanUpdate({ whyThisExists: whyDraft })}
                placeholder="e.g. Financial independence and an early retirement..."
                className="min-h-40"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
