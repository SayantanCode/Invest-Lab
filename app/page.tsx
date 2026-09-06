"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { makeDefaultPlan } from "@/lib/goals/default-plan";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { useAppNavigateListener } from "@/lib/stores/use-app-navigate-store";
import type { Plan } from "@/lib/engine";
import type { View } from "@/lib/app-view";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { HistoricalTab } from "@/components/plan/historical-tab";
import { ScenarioLab } from "@/components/plan/scenario-lab";
import { GoalsDashboard } from "@/components/plan/goals-dashboard";
import { ProfileMode } from "@/components/plan/profile-mode";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { MyPlans } from "@/components/plans/my-plans";
import { CreatePlanWizard } from "@/components/plans/create-plan-wizard";
import { PlanDetail } from "@/components/plans/plan-detail";
import { SettingsPage } from "@/components/settings/settings-page";
import { ComingSoon } from "@/components/coming-soon";
import { ImportPrompt } from "@/components/auth/import-prompt";
import { SipCalculator } from "@/components/tools/sip-calculator";
import { LumpsumCalculator } from "@/components/tools/lumpsum-calculator";
import { SwpCalculator } from "@/components/tools/swp-calculator";
import { InflationCalculator } from "@/components/tools/inflation-calculator";
import { EpfCalculator } from "@/components/tools/epf-calculator";
import { PpfCalculator } from "@/components/tools/ppf-calculator";
import { FdCalculator } from "@/components/tools/fd-calculator";
import { RdCalculator } from "@/components/tools/rd-calculator";
import { EmiCalculator } from "@/components/tools/emi-calculator";
import { GstCalculator } from "@/components/tools/gst-calculator";
import { XirrCalculator } from "@/components/tools/xirr-calculator";
import { NpsCalculator } from "@/components/tools/nps-calculator";
import { TermInsuranceCalculator } from "@/components/tools/term-insurance-calculator";
import { StpCalculator } from "@/components/tools/stp-calculator";
import { SsyCalculator } from "@/components/tools/ssy-calculator";
import { ScssCalculator } from "@/components/tools/scss-calculator";
import { RetirementCalculator } from "@/components/tools/retirement-calculator";
import { NetWorthTracker } from "@/components/tools/net-worth-tracker";
import { PortfolioAnalyzer } from "@/components/tools/portfolio-analyzer";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { HelpSupport } from "@/components/help/help-support";
import { ExportReportPage } from "@/components/report/export-report-page";

export type { View } from "@/lib/app-view";

const TITLES: Record<View["kind"], string> = {
  dashboard: "Dashboard",
  plans: "My Plans",
  "export-report": "Export Report",
  plan: "Plan Details",
  "create-plan": "Create New Plan",
  goals: "Goal Planner",
  profile: "Financial Profile",
  historical: "Historical Analysis",
  compare: "Scenario Lab",
  "portfolio-analyzer": "Portfolio Analyzer",
  "tools-sip": "SIP Calculator",
  "tools-lumpsum": "Lumpsum Calculator",
  "tools-swp": "SWP Calculator",
  "tools-inflation": "Inflation Calculator",
  "tools-epf": "EPF Calculator",
  "tools-ppf": "PPF Calculator",
  "tools-fd": "FD Calculator",
  "tools-rd": "RD Calculator",
  "tools-emi": "EMI Calculator",
  "tools-gst": "GST Calculator",
  "tools-xirr": "XIRR Calculator",
  "tools-nps": "NPS Calculator",
  "tools-term-insurance": "Term Insurance Calculator",
  "tools-stp": "STP Calculator",
  "tools-ssy": "SSY Calculator",
  "tools-scss": "SCSS Calculator",
  "tools-retirement": "Retirement Calculator",
  "net-worth": "Net Worth",
  settings: "Settings",
  help: "Help & Support",
  onboarding: "Let's Get Started",
};

const SUBTITLES: Record<View["kind"], string> = {
  dashboard: "An overview across everything you've saved.",
  plans: "Every plan you've saved, in one place.",
  "export-report": "A plain-language snapshot of your numbers — download it, or hand it to any AI for follow-up questions.",
  plan: "",
  "create-plan": "A few steps — every number stays yours to adjust afterward.",
  goals: "What are you saving for, and what does it actually take to get there.",
  profile: "Income, expenses, and what you already owe or own — so the recommendations below fit your situation.",
  historical: "Real traded NAV, not an assumption — a scratch plan replayed against what actually happened.",
  compare: "Saved plans, side by side — which one actually gets you further.",
  "portfolio-analyzer": "A closer look across every fund you hold.",
  "tools-sip": "Quick, standalone SIP projections — no plan required.",
  "tools-lumpsum": "Quick, standalone one-time investment projections.",
  "tools-swp": "Quick, standalone systematic withdrawal projections.",
  "tools-inflation": "See what today's ₹ will be worth years from now.",
  "tools-epf": "Project your EPF corpus from your basic salary and contribution rate.",
  "tools-ppf": "Project your PPF maturity value over its 15-year lock-in.",
  "tools-fd": "Project a fixed deposit's maturity value at your bank's compounding.",
  "tools-rd": "Project a recurring deposit's maturity value.",
  "tools-emi": "Work out a loan's EMI, total interest, and year-by-year payoff.",
  "tools-gst": "Add or remove GST from an amount at any slab rate.",
  "tools-xirr": "Solve the annualized return of any dated cashflow series.",
  "tools-nps": "Project your NPS corpus, tax-free lump sum, and estimated annuity pension.",
  "tools-term-insurance": "How much term cover you actually need, and the shortfall against what you have.",
  "tools-stp": "Move a lumpsum gradually from a source fund into a destination fund.",
  "tools-ssy": "Project a Sukanya Samriddhi account's maturity value.",
  "tools-scss": "Project a Senior Citizen Savings Scheme deposit's quarterly payout.",
  "tools-retirement": "How big a corpus you'll need to retire on today's expenses, and what it takes to get there.",
  "net-worth": "Everything you own, minus everything you owe.",
  settings: "Your account and how InvestLab stores your data.",
  help: "Questions, feedback, and how this tool actually works.",
  onboarding: "A few simple questions — we'll build a real plan from them.",
};

const COMING_SOON: Partial<Record<View["kind"], string>> = {};

export default function Home() {
  const { createPlan } = useSavedPlansStore();
  const { logActivity } = useActivityLog();
  const [view, setView] = React.useState<View>({ kind: "dashboard" });
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Historical Analysis is a scratch tool, not tied to a saved plan — same
  // ephemeral-until-saved spirit as the Tools playground (Part B).
  const [historicalPlan, setHistoricalPlan] = React.useState<Plan>(() => makeDefaultPlan());

  // Every "page" here is a conditional render off `view`, not a real route
  // change — so unlike normal Next.js navigation, the browser has no
  // transition to reset scroll on. Do it ourselves, matching what a real
  // route change would do by default (instant, not smooth).
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Lets something outside this component's tree — currently only the AI
  // chat panel, mounted globally in app/layout.tsx with no prop path down
  // into this local `view` state — switch the visible page, e.g. opening a
  // calculator pre-filled with the numbers it just computed.
  const handleExternalNavigate = React.useCallback((v: View) => setView(v), []);
  useAppNavigateListener(handleExternalNavigate);

  // lib/server/auth.ts sets pages.error: "/" so a failed OAuth sign-in (most
  // commonly OAuthAccountNotLinked — Google on an email that already has a
  // password-based account) lands back here instead of Auth.js's own
  // unbranded error page. Plain window.location.search, not useSearchParams,
  // since this only needs to run once on mount and avoids forcing a
  // Suspense boundary around this whole page for it.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (!error) return;
    if (error === "OAuthAccountNotLinked") {
      toast.error(
        "This email already has a password-based account here — sign in with your email and password instead."
      );
    } else {
      toast.error("That sign-in didn't go through — please try again.");
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function handleImport(json: string) {
    try {
      const imported = JSON.parse(json) as Plan;
      const saved = await createPlan({ name: imported.name || "Imported plan", planType: "wealth", plan: imported });
      logActivity({ kind: "plan_imported", planId: saved.id, message: `Plan "${saved.name}" imported` });
      setView({ kind: "plan", id: saved.id });
      toast.success("Plan imported");
    } catch {
      toast.error("That file doesn't look like a valid InvestLab plan.");
    }
  }

  const title = view.kind === "plan" || view.kind === "dashboard" ? "" : TITLES[view.kind];
  const subtitle = SUBTITLES[view.kind];
  const comingSoon = COMING_SOON[view.kind];

  return (
    <div className="min-h-screen bg-background">
      <ImportPrompt />
      <AppHeader
        onImport={handleImport}
        onNewPlan={() => setView({ kind: "create-plan" })}
        onMenuClick={() => setMobileNavOpen(true)}
      />

      <div className="flex w-full">
        <AppSidebar
          view={view}
          onViewChange={setView}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
          {title && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
              {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}

          {view.kind === "dashboard" && <DashboardOverview onNavigate={setView} />}

          {view.kind === "plans" && <MyPlans onNavigate={setView} />}

          {view.kind === "export-report" && <ExportReportPage onNavigate={setView} />}

          {view.kind === "create-plan" && (
            <CreatePlanWizard
              onCancel={() => setView({ kind: "plans" })}
              onCreated={(id) => setView({ kind: "plan", id })}
            />
          )}

          {view.kind === "plan" && <PlanDetail planId={view.id} onNavigate={setView} />}

          {view.kind === "historical" && <HistoricalTab plan={historicalPlan} onChange={setHistoricalPlan} />}

          {view.kind === "compare" && (
            <ScenarioLab onOpenPlan={(id) => setView({ kind: "plan", id })} />
          )}

          {view.kind === "goals" && (
            <GoalsDashboard
              onNavigate={setView}
              focusGoalId={view.focusGoalId}
              onCreatePlan={async (created) => {
                const saved = await createPlan({ name: created.name, planType: "goal", plan: created });
                logActivity({ kind: "plan_created", planId: saved.id, message: `Plan "${saved.name}" created` });
                setView({ kind: "plan", id: saved.id });
              }}
            />
          )}

          {view.kind === "profile" && <ProfileMode />}

          {view.kind === "portfolio-analyzer" && <PortfolioAnalyzer onNavigate={setView} />}

          {view.kind === "tools-sip" && <SipCalculator initial={view.initial} onSaved={(id) => setView({ kind: "plan", id })} />}

          {view.kind === "tools-lumpsum" && <LumpsumCalculator onSaved={(id) => setView({ kind: "plan", id })} />}

          {view.kind === "tools-swp" && <SwpCalculator onSaved={(id) => setView({ kind: "plan", id })} />}

          {view.kind === "tools-inflation" && <InflationCalculator initial={view.initial} />}

          {view.kind === "tools-epf" && <EpfCalculator initial={view.initial} />}

          {view.kind === "tools-ppf" && <PpfCalculator initial={view.initial} />}

          {view.kind === "tools-fd" && <FdCalculator initial={view.initial} />}

          {view.kind === "tools-rd" && <RdCalculator initial={view.initial} />}

          {view.kind === "tools-emi" && <EmiCalculator initial={view.initial} />}

          {view.kind === "tools-gst" && <GstCalculator initial={view.initial} />}

          {view.kind === "tools-xirr" && <XirrCalculator initial={view.initial} />}

          {view.kind === "tools-nps" && <NpsCalculator initial={view.initial} />}

          {view.kind === "tools-term-insurance" && <TermInsuranceCalculator initial={view.initial} />}

          {view.kind === "tools-stp" && <StpCalculator initial={view.initial} />}

          {view.kind === "tools-ssy" && <SsyCalculator initial={view.initial} />}

          {view.kind === "tools-scss" && <ScssCalculator initial={view.initial} />}

          {view.kind === "tools-retirement" && <RetirementCalculator initial={view.initial} />}

          {view.kind === "net-worth" && <NetWorthTracker />}

          {view.kind === "settings" && <SettingsPage onNavigate={setView} />}

          {view.kind === "help" && <HelpSupport onNavigate={setView} />}

          {view.kind === "onboarding" && (
            <OnboardingWizard onDone={(id) => setView({ kind: "plan", id })} />
          )}

          {comingSoon && <ComingSoon title={title} description={comingSoon} />}

          <footer className="mt-4 border-t pt-5 text-xs text-muted-foreground">
            <p>
              InvestLab is a free, educational simulation tool. Forecast figures are based on the return and
              inflation assumptions you set above — they are not guarantees and not investment advice. Historical
              figures use real NAV data sourced from a public community API (mfapi.in, itself built on AMFI&apos;s
              published NAV feed); InvestLab is not affiliated with AMFI, SEBI, or any AMC, and data may lag by a
              day. Nothing here is a recommendation to buy or sell any fund.
            </p>
            <Link href="/privacy-policy" className="mt-2 inline-block underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
