// The single source of truth for "what page is showing" — app/page.tsx owns
// the actual state, but the type lives here (and is re-exported from there)
// so lib/use-app-navigate-store.ts can reference it without importing a
// client page component. Every tools-* kind's optional `initial` lets a
// caller (currently: the AI chat panel, deep-linking a calculation it just
// made) pre-fill that calculator's inputs instead of opening it blank.

export type View =
  | { kind: "dashboard" }
  | { kind: "plans" }
  | { kind: "export-report" }
  | { kind: "plan"; id: string }
  | { kind: "create-plan" }
  | { kind: "goals"; focusGoalId?: string }
  | { kind: "profile" }
  | { kind: "historical" }
  | { kind: "compare" }
  | { kind: "portfolio-analyzer" }
  | { kind: "tools-sip"; initial?: { monthly?: number; returnPct?: number; years?: number } }
  | { kind: "tools-lumpsum" }
  | { kind: "tools-swp" }
  | {
      kind: "tools-inflation";
      initial?: { amount?: number; inflationPct?: number; years?: number; direction?: "future-cost" | "todays-value" };
    }
  | {
      kind: "tools-epf";
      initial?: {
        basicSalary?: number;
        employeePct?: number;
        employerPct?: number;
        ratePct?: number;
        currentAge?: number;
        jobStartAge?: number;
        retirementAge?: number;
        existingBalance?: number;
      };
    }
  | { kind: "tools-ppf"; initial?: { annualContribution?: number; ratePct?: number; years?: number } }
  | { kind: "tools-fd"; initial?: { principal?: number; ratePct?: number; years?: number } }
  | { kind: "tools-rd"; initial?: { monthlyDeposit?: number; ratePct?: number; years?: number } }
  | { kind: "tools-emi"; initial?: { principal?: number; ratePct?: number; years?: number } }
  | { kind: "tools-gst"; initial?: { amount?: number; gstPct?: number; direction?: "add" | "remove" } }
  | { kind: "tools-xirr"; initial?: { cashflows?: { date: string; amount: number }[] } }
  | {
      kind: "tools-nps";
      initial?: {
        monthlyContribution?: number;
        returnPct?: number;
        currentAge?: number;
        retirementAge?: number;
        existingBalance?: number;
      };
    }
  | {
      kind: "tools-term-insurance";
      initial?: {
        annualIncome?: number;
        currentAge?: number;
        outstandingDebts?: number;
        futureGoalCosts?: number;
        existingInvestments?: number;
        existingCover?: number;
      };
    }
  | { kind: "tools-stp"; initial?: { sourceLumpsum?: number; monthlyTransfer?: number; sourceRatePct?: number; destRatePct?: number; transferMonths?: number } }
  | { kind: "tools-ssy"; initial?: { annualContribution?: number; ratePct?: number } }
  | { kind: "tools-scss"; initial?: { depositAmount?: number; ratePct?: number } }
  | {
      kind: "tools-retirement";
      initial?: {
        presentMonthlyExpense?: number;
        inflationPct?: number;
        currentAge?: number;
        retirementAge?: number;
        lifeExpectancy?: number;
        preRetirementReturnPct?: number;
        postRetirementReturnPct?: number;
        currentCorpus?: number;
      };
    }
  | { kind: "net-worth" }
  | { kind: "settings" }
  | { kind: "help" }
  | { kind: "onboarding" };
