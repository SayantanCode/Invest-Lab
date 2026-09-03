// The financial-planning waterfall a real planner applies before ever
// discussing a goal SIP: emergency fund → insurance → high-interest debt →
// goal capacity. Pure, transparent rules — every number here traces back to
// a field on Profile, no hidden scoring model.

import type { Profile } from "@/lib/stores/use-profile-store";
import { formatINR } from "@/lib/format";

export type RecommendationStatus = "critical" | "warning" | "ok";

export interface RecommendationItem {
  key: string;
  title: string;
  status: RecommendationStatus;
  detail: string;
  amount?: number;
}

const HIGH_INTEREST_THRESHOLD_PCT = 15;
const ASSUMED_MARKET_RETURN_PCT = 12;
/** Rule-of-thumb health cover floor for a family floater — ₹5L per person, not a real quote. */
const HEALTH_COVER_PER_PERSON = 500000;
/** Rule-of-thumb term cover target — a common "10-15x annual income" guideline, we use 12x. */
const TERM_COVER_INCOME_MULTIPLE = 12;

/** The single most urgent state — checked first, before even the emergency fund. */
function overspendingRecommendation(profile: Profile): RecommendationItem | null {
  const surplus = monthlySurplus(profile);
  if (surplus >= 0) return null;
  return {
    key: "overspending",
    title: "Spending more than you earn",
    status: "critical",
    detail: `Your expenses, caregiving costs, and EMIs add up to ${formatINR(Math.abs(surplus))}/mo more than your income. This needs fixing before anything else — none of the numbers below are meaningful until your monthly surplus is positive.`,
  };
}

export function totalMonthlyEMI(profile: Pick<Profile, "debts">): number {
  return profile.debts.reduce((sum, d) => sum + d.monthlyEMI, 0);
}

/** What's left every month after living expenses, caregiving costs, and EMIs — the true ceiling on any new SIP. */
export function monthlySurplus(
  profile: Pick<Profile, "monthlyIncome" | "monthlyExpenses" | "monthlyCaregivingExpenses" | "debts">
): number {
  return profile.monthlyIncome - profile.monthlyExpenses - profile.monthlyCaregivingExpenses - totalMonthlyEMI(profile);
}

/** 6 months if anyone depends on this income, 3 otherwise — the standard rule of thumb. */
export function recommendedEmergencyMonths(profile: Profile): number {
  return profile.dependents.length > 0 ? 6 : 3;
}

export function emergencyFundTarget(profile: Profile): number {
  return recommendedEmergencyMonths(profile) * profile.monthlyExpenses;
}

function emergencyFundRecommendation(profile: Profile): RecommendationItem {
  const target = emergencyFundTarget(profile);
  const saved = profile.emergencyFundSaved;
  const months = recommendedEmergencyMonths(profile);
  const shortfall = Math.max(0, target - saved);

  if (target <= 0) {
    return {
      key: "emergency-fund",
      title: "Emergency fund",
      status: "ok",
      detail: "No monthly expenses entered yet, so there's no target to size this against.",
    };
  }

  const status: RecommendationStatus = saved >= target ? "ok" : saved >= target * 0.5 ? "warning" : "critical";
  const detail =
    status === "ok"
      ? `You have ${months} months of expenses saved — this is fully funded.`
      : `Aim for ${months} months of expenses (${formatINR(target)}) before investing further. You're short by ${formatINR(shortfall)}.`;

  return { key: "emergency-fund", title: "Emergency fund", status, detail, amount: shortfall };
}

function healthInsuranceRecommendation(profile: Profile): RecommendationItem {
  if (!profile.hasHealthInsurance) {
    return {
      key: "health-insurance",
      title: "Health insurance",
      status: "critical",
      detail: "No health insurance on file. A single hospitalization can wipe out years of savings — this usually comes before any investing.",
    };
  }
  const recommendedCover = HEALTH_COVER_PER_PERSON * (1 + profile.dependents.length);
  const cover = profile.healthInsuranceCoverAmount;
  if (cover != null && cover > 0 && cover < recommendedCover) {
    return {
      key: "health-insurance",
      title: "Health insurance",
      status: "warning",
      detail: `You have ${formatINR(cover)} of cover, but a rough rule of thumb for your household size is ${formatINR(recommendedCover)} — worth checking if it's enough.`,
    };
  }
  return {
    key: "health-insurance",
    title: "Health insurance",
    status: "ok",
    detail: "You already have health cover — one hospitalization won't undo your savings.",
  };
}

function termInsuranceRecommendation(profile: Profile): RecommendationItem {
  if (profile.dependents.length === 0) {
    return {
      key: "term-insurance",
      title: "Term life insurance",
      status: "ok",
      detail: "No dependents on file — term insurance is usually less urgent until someone relies on your income.",
    };
  }
  if (!profile.hasTermLifeInsurance) {
    return {
      key: "term-insurance",
      title: "Term life insurance",
      status: "critical",
      detail: `${profile.dependents.length} ${profile.dependents.length === 1 ? "dependent" : "dependents"} rely on your income with no term cover in place — this is usually a higher priority than investing.`,
    };
  }
  const recommendedCover = profile.monthlyIncome * 12 * TERM_COVER_INCOME_MULTIPLE;
  const cover = profile.termInsuranceCoverAmount;
  if (cover != null && cover > 0 && cover < recommendedCover) {
    return {
      key: "term-insurance",
      title: "Term life insurance",
      status: "warning",
      detail: `You have ${formatINR(cover)} of cover, but a common rule of thumb is ${TERM_COVER_INCOME_MULTIPLE}x your annual income (${formatINR(recommendedCover)}) — worth checking if it's enough.`,
    };
  }
  return {
    key: "term-insurance",
    title: "Term life insurance",
    status: "ok",
    detail: "You have term cover in place for your dependents.",
  };
}

/** Only surfaced when a parent is listed as a dependent — most profiles won't see this item at all. */
function caregivingRecommendation(profile: Profile): RecommendationItem | null {
  const hasParent = profile.dependents.some((d) => d.relation === "parent");
  if (!hasParent) return null;
  if (profile.monthlyCaregivingExpenses > 0) {
    return {
      key: "caregiving",
      title: "Parents' medical & caregiving costs",
      status: "ok",
      detail: `You've set aside ${formatINR(profile.monthlyCaregivingExpenses)}/mo for this — it's already counted in your surplus.`,
    };
  }
  return {
    key: "caregiving",
    title: "Parents' medical & caregiving costs",
    status: "warning",
    detail: "You've listed a parent as a dependent but haven't sized any ongoing medical/caregiving cost — these tend to be lumpy and easy to underestimate. Worth entering even a rough monthly figure.",
  };
}

function debtRecommendations(profile: Profile): RecommendationItem[] {
  return profile.debts
    .filter((d) => d.interestRatePct > HIGH_INTEREST_THRESHOLD_PCT && d.outstandingAmount > 0)
    .map((d) => ({
      key: `debt-${d.id}`,
      title: d.label || "Debt",
      status: "critical" as const,
      detail: `${d.interestRatePct}% interest on ${formatINR(d.outstandingAmount)} outstanding — paying this off is a guaranteed ${d.interestRatePct}% return, beating the ~${ASSUMED_MARKET_RETURN_PCT}% market assumption used elsewhere in this app. Usually worth clearing before investing more.`,
      amount: d.outstandingAmount,
    }));
}

function goalCapacityRecommendation(profile: Profile, goalsMonthlyTotal: number): RecommendationItem {
  const surplus = monthlySurplus(profile);
  const shortfall = Math.max(0, goalsMonthlyTotal - surplus);

  if (goalsMonthlyTotal <= 0) {
    return {
      key: "goal-capacity",
      title: "Goal capacity",
      status: "ok",
      detail: "No goals set yet — add one under Goals to see whether it fits your monthly surplus.",
    };
  }

  const status: RecommendationStatus = surplus >= goalsMonthlyTotal ? "ok" : surplus >= goalsMonthlyTotal * 0.7 ? "warning" : "critical";
  const detail =
    status === "ok"
      ? `Your goals need ${formatINR(goalsMonthlyTotal)}/mo — comfortably within your ${formatINR(surplus)}/mo surplus.`
      : `Your goals need ${formatINR(goalsMonthlyTotal)}/mo but your surplus is only ${formatINR(surplus)}/mo — short by ${formatINR(shortfall)}. See the goal timeline below for a realistic order and start dates instead of running them all at once.`;

  return { key: "goal-capacity", title: "Goal capacity", status, detail, amount: shortfall };
}

/** The full prioritized list, in waterfall order: protect first, then invest. */
export function buildRecommendations(profile: Profile, goalsMonthlyTotal: number): RecommendationItem[] {
  const overspending = overspendingRecommendation(profile);
  return [
    ...(overspending ? [overspending] : []),
    emergencyFundRecommendation(profile),
    healthInsuranceRecommendation(profile),
    termInsuranceRecommendation(profile),
    ...debtRecommendations(profile),
    ...(caregivingRecommendation(profile) ? [caregivingRecommendation(profile)!] : []),
    goalCapacityRecommendation(profile, goalsMonthlyTotal),
  ];
}
