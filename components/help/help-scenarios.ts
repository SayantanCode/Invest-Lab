import type { LucideIcon } from "lucide-react";
import { Sprout, Home, LineChart } from "lucide-react";

import type { View } from "@/app/page";

export interface HelpScenario {
  key: string;
  persona: string;
  icon: LucideIcon;
  summary: string;
  steps: string[];
  startView: View;
  startLabel: string;
}

export const HELP_SCENARIOS: HelpScenario[] = [
  {
    key: "first-timer",
    persona: "\"I'm 24, just started earning, and have no idea where to begin.\"",
    icon: Sprout,
    summary: "Build a safety net first, then start a plain SIP — nothing fancy needed yet.",
    steps: [
      "Financial Profile — enter your income and expenses; it'll tell you your emergency-fund target before anything else.",
      "Goal Planner — add an \"Emergency fund\" goal (usually 3–6 months of expenses), then a general wealth-building goal once that's on track.",
      "SIP Calculator (Tools) — get a feel for what a monthly SIP grows into over 10–15 years before committing to a real plan.",
    ],
    startView: { kind: "profile" },
    startLabel: "Start with your Profile",
  },
  {
    key: "family-house",
    persona: "\"I'm 32, married with a young kid, and want a house in a few years.\"",
    icon: Home,
    summary: "See the down payment and the mortgage that follows it together, not as two separate surprises.",
    steps: [
      "Financial Profile — add your spouse and child as dependents (the child's age auto-suggests an education-goal timeline later); set your city so the home target reflects local costs.",
      "Goal Planner — add a \"Home down payment\" goal and a \"Child's education\" goal; the goal timeline shows whether both fit your surplus and, if not, which one waits.",
      "On the Home goal, use the built-in loan-EMI note to check whether the mortgage that follows the down payment actually fits what frees up once the SIP ends.",
    ],
    startView: { kind: "profile" },
    startLabel: "Start with your Profile",
  },
  {
    key: "retirement-check",
    persona: "\"I'm 45, already invest in a couple of mutual funds, and want to know if I'm on track for retirement.\"",
    icon: LineChart,
    summary: "Find out what your actual funds have actually returned, then check that against what retirement needs.",
    steps: [
      "Historical Analysis — backtest your real funds against their actual traded NAV history, not an assumption.",
      "Goal Planner — add a \"Retirement corpus\" goal; the built-in retirement-income note shows what that corpus could sustainably pay you every month once you stop working.",
      "Portfolio Analyzer — once you've saved a few plans for your real funds, see your combined exposure and whether you're overly concentrated in one of them.",
    ],
    startView: { kind: "historical" },
    startLabel: "Start with Historical Analysis",
  },
];
