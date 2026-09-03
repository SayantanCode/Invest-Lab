// Common goal templates — the same handful every Indian goal-planning tool
// leads with. Each preset just pre-fills sensible defaults (goal-specific
// inflation runs hotter for things like education than general CPI); every
// field stays editable afterward.

import { Bike, Car, GraduationCap, Heart, Home, LifeBuoy, Plane, PiggyBank, Sparkles, type LucideIcon } from "lucide-react";
import { cityMultiplier, LOCATION_SENSITIVE_PRESET_KEYS } from "@/lib/calculators/city-cost-index";

export interface GoalPreset {
  key: string;
  label: string;
  icon: LucideIcon;
  defaultInflationPct: number;
  defaultYears: number;
  defaultAmount: number;
  hint: string;
}

export const GOAL_PRESETS: GoalPreset[] = [
  {
    key: "home",
    label: "Home down payment",
    icon: Home,
    defaultInflationPct: 6,
    defaultYears: 7,
    defaultAmount: 2000000,
    hint: "Property prices tend to outrun general inflation.",
  },
  {
    key: "bike",
    label: "Buy a bike",
    icon: Bike,
    defaultInflationPct: 5,
    defaultYears: 2,
    defaultAmount: 150000,
    hint: "",
  },
  {
    key: "vehicle",
    label: "Buy a car",
    icon: Car,
    defaultInflationPct: 5,
    defaultYears: 3,
    defaultAmount: 800000,
    hint: "",
  },
  {
    key: "marriage",
    label: "Marriage",
    icon: Heart,
    defaultInflationPct: 8,
    defaultYears: 8,
    defaultAmount: 1500000,
    hint: "Wedding costs have historically outpaced CPI.",
  },
  {
    key: "education",
    label: "Child's education",
    icon: GraduationCap,
    defaultInflationPct: 10,
    defaultYears: 15,
    defaultAmount: 2500000,
    hint: "Education costs typically run 9–12% inflation, well above general CPI.",
  },
  {
    key: "retirement",
    label: "Retirement corpus",
    icon: PiggyBank,
    defaultInflationPct: 6,
    defaultYears: 25,
    defaultAmount: 30000000,
    hint: "This is the corpus target, not a post-retirement withdrawal plan.",
  },
  {
    key: "travel",
    label: "Dream vacation",
    icon: Plane,
    defaultInflationPct: 6,
    defaultYears: 2,
    defaultAmount: 400000,
    hint: "",
  },
  {
    key: "emergency",
    label: "Emergency fund",
    icon: LifeBuoy,
    defaultInflationPct: 5,
    defaultYears: 1,
    defaultAmount: 300000,
    hint: "Usually sized as 6–12 months of expenses — keep this one short and liquid.",
  },
  {
    key: "custom",
    label: "Custom goal",
    icon: Sparkles,
    defaultInflationPct: 6,
    defaultYears: 5,
    defaultAmount: 500000,
    hint: "",
  },
];

export function getPreset(key: string): GoalPreset {
  return GOAL_PRESETS.find((p) => p.key === key) ?? GOAL_PRESETS[GOAL_PRESETS.length - 1];
}

/** The preset's default amount, nudged toward the given city's typical costs — only for presets where location actually drives the price (home, vehicle, marriage). */
export function presetDefaultAmount(preset: GoalPreset, cityKey?: string): number {
  if (!LOCATION_SENSITIVE_PRESET_KEYS.has(preset.key)) return preset.defaultAmount;
  return Math.round((preset.defaultAmount * cityMultiplier(cityKey)) / 10000) * 10000;
}
