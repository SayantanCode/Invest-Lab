// The actual chat, rendered inside the header-triggered panel
// (ai-assistant-panel.tsx). Assumes the caller has already confirmed the
// user is signed in; talks to app/api/chat/route.ts, handing it a snapshot
// of goals/profile (both localStorage-only, never synced server-side the way
// saved plans are) plus a lightweight computed summary of the real saved
// plans, so the assistant can discuss them by name without a dedicated tool.

"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { Send, Mic, Square, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { useGoalStore, type GoalInput } from "@/lib/stores/use-goal-store";
import { useProfileStore, type Debt } from "@/lib/stores/use-profile-store";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { getPreset } from "@/lib/goals/goal-presets";
import { computeEmi } from "@/lib/calculators/emi-calc";
import { buildScratchPlan } from "@/lib/goals/build-scratch-plan";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { newId } from "@/lib/id";
import { formatINR } from "@/lib/format";
import { fetchSchemeList, type SchemeListItem } from "@/lib/data/mfapi";
import { containsProfanity } from "@/lib/profanity-filter";
import { navigateApp } from "@/lib/stores/use-app-navigate-store";
import type { View } from "@/lib/app-view";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Sent messages can't exceed this — keeps a stray huge paste from ballooning input-token cost. */
const MAX_MESSAGE_LENGTH = 500;
/** How many real fund matches to hand back per searchFunds call — enough to give real choices without flooding the chat or the model's context. */
const MAX_FUND_RESULTS = 6;

/** Shown as clickable starter chips on the empty state — a spread across what the assistant can actually do (quick math, goal setup, fund search, plan creation, budget fitting), so picking one gives a real sense of the range, not just one example. Clicking fills the input rather than sending, so it's a starting point to edit, not a canned command. */
const EXAMPLE_PROMPTS = [
  "I earn ₹80,000/mo, what SIP gets me to ₹50L in 10 years?",
  "I want to buy a bike, a house, and save for retirement — how much do I need?",
  "I want a SIP but don't know which funds — suggest 2-3 for growth and safety",
  "Create a ₹5,000/month SIP plan for 15 years",
  "My goals don't fit my budget, what should I do?",
];
/** How long an unattended slide stays up before the carousel auto-advances — resets on any manual dot/arrow interaction so it doesn't jump right after someone navigates. */
const CAROUSEL_AUTO_ADVANCE_MS = 4500;

// A little continuity, not a full archive: the recent conversation survives
// closing the panel or reloading the page (both fully unmount ChatPanel
// today, per ai-assistant-panel.tsx's `if (!open) return null`), capped to
// the last few exchanges rather than kept forever.
const CHAT_HISTORY_KEY = "investlab.ai-chat-history.v1";
const MAX_HISTORY_MESSAGES = 20;

function readPersistedMessages(): UIMessage[] {
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePersistedMessages(messages: UIMessage[]) {
  try {
    window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)));
  } catch {
    // Best-effort only — the conversation still works for this session either way.
  }
}

/** The transport throws the raw HTTP response body as Error.message (see ai/src/ui/http-chat-transport.ts) — for a JSON error body like /api/chat's 429, that's the literal `{"error":"..."}` string, not the friendly text inside it. This pulls the actual message back out. */
function parseChatError(error: Error): { message: string; quota?: { remaining: number; limit: number } } {
  try {
    const parsed = JSON.parse(error.message);
    if (parsed && typeof parsed.error === "string") {
      const quota =
        typeof parsed.remaining === "number" && typeof parsed.limit === "number"
          ? { remaining: parsed.remaining, limit: parsed.limit }
          : undefined;
      return { message: parsed.error, quota };
    }
  } catch {
    // Not JSON — a network failure or similar; fall through to a generic message.
  }
  return { message: "Something went wrong — try again in a moment." };
}

// The Web Speech API's core types aren't in this project's bundled DOM lib
// (only some result-shape interfaces are) — these cover exactly what's used
// below, kept local rather than adding a global ambient declaration for one
// call site.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface ProposedDebt {
  label: string;
  outstandingAmount: number;
  interestRatePct: number;
  monthlyEMI: number;
  tenureMonths?: number;
}

interface ProposedProfile {
  monthlyIncome: number;
  monthlyExpenses: number;
  emergencyFundSaved: number;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  dob?: string;
  debts?: ProposedDebt[];
}

interface ProposedGoal {
  id?: string;
  name: string;
  presetKey: string;
  targetAmountToday: number;
  years: number;
  existingSavings: number;
  loanAmount?: number;
  loanRatePct?: number;
  loanYears?: number;
}

interface ProposedPlan {
  name: string;
  kind: "sip" | "lumpsum";
  amount: number;
  years: number;
  expectedReturnPct: number;
}

// The per-user quota (lib/server/ai-rate-limit.ts) is keyed by UTC calendar date, so
// it always opens back up at the next UTC midnight — no server round trip
// needed to know when.
function nextUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
}

/** "1hr 12 min" above an hour, "30 min" above a minute, a live "30 sec" tick below that. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) return `${hours}hr ${minutes} min`;
  if (totalSeconds >= 60) return `${minutes} min`;
  return `${seconds} sec`;
}

/** Every server-executed calculator tool, mapped to the standalone Tools page it mirrors — its exact args become that page's pre-filled inputs, so clicking a result opens the same calculation instead of a blank form. */
const CALC_TOOL_LABELS: Record<string, string> = {
  "tool-calculateSip": "SIP Calculator",
  "tool-calculateEmi": "EMI Calculator",
  "tool-calculateFd": "FD Calculator",
  "tool-calculatePpf": "PPF Calculator",
  "tool-calculateRd": "RD Calculator",
  "tool-calculateInflation": "Inflation Calculator",
  "tool-calculateEpf": "EPF Calculator",
  "tool-calculateGst": "GST Calculator",
  "tool-calculateXirr": "XIRR Calculator",
  "tool-calculateNps": "NPS Calculator",
  "tool-calculateTermInsuranceCover": "Term Insurance Calculator",
  "tool-calculateStp": "STP Calculator",
  "tool-calculateSsy": "SSY Calculator",
  "tool-calculateScss": "SCSS Calculator",
  "tool-calculateRetirementCorpus": "Retirement Calculator",
};

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

/** Maps a finished calculator tool call's real args (and, for calculateSip's target-solve mode, its result) to the View that reopens the same calculation. Returns null for tool types with no standalone page (e.g. suggestAdjustments). */
function calcToolView(type: string, input?: Record<string, unknown>, output?: Record<string, unknown>): View | null {
  if (!input) return null;
  switch (type) {
    case "tool-calculateSip":
      return {
        kind: "tools-sip",
        initial: {
          monthly: input.targetAmount != null ? num(output?.requiredMonthlySip) : num(input.monthlyAmount),
          years: num(input.years),
          returnPct: num(input.returnPct),
        },
      };
    case "tool-calculateEmi":
      return { kind: "tools-emi", initial: { principal: num(input.principal), ratePct: num(input.ratePct), years: num(input.years) } };
    case "tool-calculateFd":
      return { kind: "tools-fd", initial: { principal: num(input.principal), ratePct: num(input.ratePct), years: num(input.years) } };
    case "tool-calculatePpf":
      return {
        kind: "tools-ppf",
        initial: { annualContribution: num(input.annualContribution), ratePct: num(input.ratePct), years: num(input.years) },
      };
    case "tool-calculateRd":
      return {
        kind: "tools-rd",
        initial: { monthlyDeposit: num(input.monthlyDeposit), ratePct: num(input.ratePct), years: num(input.years) },
      };
    case "tool-calculateInflation":
      return {
        kind: "tools-inflation",
        initial: {
          amount: num(input.amount),
          inflationPct: num(input.inflationPct),
          years: num(input.years),
          direction: input.direction === "todays-value" ? "todays-value" : "future-cost",
        },
      };
    case "tool-calculateEpf":
      return {
        kind: "tools-epf",
        initial: {
          basicSalary: num(input.basicSalary),
          employeePct: num(input.employeePct),
          employerPct: num(input.employerPct),
          ratePct: num(input.ratePct),
          currentAge: num(input.currentAge),
          jobStartAge: num(input.jobStartAge),
          retirementAge: num(input.retirementAge),
          existingBalance: num(input.existingBalance),
        },
      };
    case "tool-calculateGst":
      return {
        kind: "tools-gst",
        initial: { amount: num(input.amount), gstPct: num(input.gstPct), direction: input.direction === "remove" ? "remove" : "add" },
      };
    case "tool-calculateXirr":
      return {
        kind: "tools-xirr",
        initial: { cashflows: Array.isArray(input.cashflows) ? (input.cashflows as { date: string; amount: number }[]) : undefined },
      };
    case "tool-calculateNps":
      return {
        kind: "tools-nps",
        initial: {
          monthlyContribution: num(input.monthlyContribution),
          returnPct: num(input.returnPct),
          currentAge: num(input.currentAge),
          retirementAge: num(input.retirementAge),
          existingBalance: num(input.existingBalance),
        },
      };
    case "tool-calculateTermInsuranceCover":
      return {
        kind: "tools-term-insurance",
        initial: {
          annualIncome: num(input.annualIncome),
          currentAge: num(input.currentAge),
          outstandingDebts: num(input.outstandingDebts),
          futureGoalCosts: num(input.futureGoalCosts),
          existingInvestments: num(input.existingInvestments),
          existingCover: num(input.existingCover),
        },
      };
    case "tool-calculateStp":
      return {
        kind: "tools-stp",
        initial: {
          sourceLumpsum: num(input.sourceLumpsum),
          monthlyTransfer: num(input.monthlyTransfer),
          sourceRatePct: num(input.sourceRatePct),
          destRatePct: num(input.destRatePct),
          transferMonths: num(input.transferMonths),
        },
      };
    case "tool-calculateSsy":
      return { kind: "tools-ssy", initial: { annualContribution: num(input.annualContribution), ratePct: num(input.ratePct) } };
    case "tool-calculateScss":
      return { kind: "tools-scss", initial: { depositAmount: num(input.depositAmount), ratePct: num(input.ratePct) } };
    case "tool-calculateRetirementCorpus":
      return {
        kind: "tools-retirement",
        initial: {
          presentMonthlyExpense: num(input.presentMonthlyExpense),
          inflationPct: num(input.inflationPct),
          currentAge: num(input.currentAge),
          retirementAge: num(input.retirementAge),
          lifeExpectancy: num(input.lifeExpectancy),
          preRetirementReturnPct: num(input.preRetirementReturnPct),
          postRetirementReturnPct: num(input.postRetirementReturnPct),
          currentCorpus: num(input.currentCorpus),
        },
      };
    default:
      return null;
  }
}

/** The small "Open in X Calculator →" / "View in Goal Planner →" link appended after a result — same treatment everywhere a chat result has somewhere real to click through to. */
function ResultLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {label} →
    </button>
  );
}

interface ProposedChoice {
  question: string;
  options: string[];
  mode: "single" | "multi";
}

/** One consistent, compact style for every assistant reply — bold/italic/lists/tables all render the same way everywhere, instead of raw ** and # showing up as literal characters. No raw HTML support (react-markdown doesn't render it by default), so this stays safe against anything a model might echo back. */
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  h1: ({ children }) => <p className="mt-2 mb-1 font-semibold first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mt-2 mb-1 font-semibold first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mt-2 mb-1 font-semibold first:mt-0">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
  hr: () => <hr className="my-2 border-border" />,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b px-2 py-1 align-top">{children}</td>,
};

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {text}
    </ReactMarkdown>
  );
}

export function ChatPanel({ messagesClassName }: { messagesClassName?: string }) {
  const { goals, saveGoal, updateGoal } = useGoalStore();
  const { profile, saveProfile } = useProfileStore();
  const { plans, createPlan } = useSavedPlansStore();

  // A lightweight, already-computed summary — not the full event list/
  // assumptions, which would be a lot of tokens for no benefit in a chat
  // context — so the assistant can discuss "how's my X plan doing" by name
  // without needing a dedicated tool for something this cheap to just hand
  // over. Recomputed only when the plan list itself changes.
  const planSummaries = React.useMemo(
    () =>
      plans.map((p) => {
        const { expected } = computePlanResults(p.plan);
        return {
          name: p.name,
          planType: p.planType,
          totalInvested: Math.round(expected.totalInvested),
          currentValue: Math.round(expected.finalValue),
          xirrPct: expected.xirrPct != null ? Math.round(expected.xirrPct * 10) / 10 : null,
        };
      }),
    [plans]
  );
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [activePromptIndex, setActivePromptIndex] = React.useState(0);
  const goToPrompt = React.useCallback((index: number) => {
    setActivePromptIndex(((index % EXAMPLE_PROMPTS.length) + EXAMPLE_PROMPTS.length) % EXAMPLE_PROMPTS.length);
  }, []);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = React.useState<string | null>(null);
  const [pendingMultiChoice, setPendingMultiChoice] = React.useState<Record<string, Set<string>>>({});
  const [savingPlanCallId, setSavingPlanCallId] = React.useState<string | null>(null);
  const [listening, setListening] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const voiceSupported = React.useMemo(() => getSpeechRecognitionCtor() != null, []);
  const [quota, setQuota] = React.useState<{ remaining: number; limit: number } | null>(null);
  const [initialMessages] = React.useState<UIMessage[]>(() => readPersistedMessages());

  const refreshQuota = React.useCallback(() => {
    fetch("/api/chat/quota")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.remaining === "number") setQuota(data);
      })
      .catch(() => {
        // Best-effort — the composer still works without the count shown.
      });
  }, []);

  React.useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  // Ticks once a second only while the daily quota is actually exhausted —
  // shows a live "opens in Xh Ym / X min / X sec" countdown the moment the
  // panel is opened, not just after a failed send. Once the countdown
  // crosses the next UTC midnight (where the quota resets), re-checks with
  // the server rather than assuming — the client clock could be off, or the
  // reset could lag by a moment.
  const [countdownNow, setCountdownNow] = React.useState(() => Date.now());
  const quotaExhausted = quota != null && quota.remaining === 0;
  React.useEffect(() => {
    if (!quotaExhausted) return;
    const id = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [quotaExhausted]);
  React.useEffect(() => {
    if (quotaExhausted && nextUtcMidnight() - countdownNow <= 0) refreshQuota();
  }, [quotaExhausted, countdownNow, refreshQuota]);

  const { messages, sendMessage, addToolOutput, setMessages, status: chatStatus } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { goals, profile, plans: planSummaries } }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => refreshQuota(),
    onError: (error) => {
      const { message, quota: quotaFromError } = parseChatError(error);
      setErrorMessage(message);
      if (quotaFromError) setQuota(quotaFromError);
      else refreshQuota();
    },
  });

  // Auto-advances the starter-prompt carousel while it's actually showing
  // (only true pre-first-message) — re-arms on every index change, whether
  // that change came from this timer or a manual dot/arrow click, so
  // navigating manually doesn't get immediately undone by an advance that
  // was already half-elapsed.
  React.useEffect(() => {
    if (messages.length > 0) return;
    const id = setTimeout(() => {
      setActivePromptIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
    }, CAROUSEL_AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [messages.length, activePromptIndex]);

  // Persist once an exchange settles (not on every token while streaming,
  // which would mean a write per chunk) — covers both normal replies and
  // tool-confirm/decline, since either way chatStatus returns to "ready".
  React.useEffect(() => {
    if (chatStatus === "streaming" || chatStatus === "submitted") return;
    writePersistedMessages(messages);
  }, [messages, chatStatus]);

  function handleClearHistory() {
    setMessages([]);
    try {
      window.localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch {
      // Non-fatal — the in-memory chat is cleared either way.
    }
  }

  // searchFunds is read-only (a lookup, not an action) and needs the same
  // browser-side mfapi.in fetch every other fund search in this app uses
  // (see lib/data/mfapi.ts's own comment on why that stays client-side, not
  // server-side) — so unlike propose*, it resolves itself the moment its
  // input arrives, with no confirm step for the user to click through.
  const resolvedFundSearches = React.useRef(new Set<string>());
  React.useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type !== "tool-searchFunds") continue;
        const toolPart = part as { state: string; toolCallId: string; input?: { query?: string } };
        if (toolPart.state !== "input-available" || !toolPart.input?.query) continue;
        if (resolvedFundSearches.current.has(toolPart.toolCallId)) continue;
        resolvedFundSearches.current.add(toolPart.toolCallId);
        const query = toolPart.input.query.toLowerCase();
        fetchSchemeList()
          .then((schemes) => {
            const results: SchemeListItem[] = [];
            for (const s of schemes) {
              if (s.schemeName.toLowerCase().includes(query)) {
                results.push(s);
                if (results.length >= MAX_FUND_RESULTS) break;
              }
            }
            addToolOutput({ tool: "searchFunds", toolCallId: toolPart.toolCallId, output: { results } });
          })
          .catch(() => {
            addToolOutput({
              tool: "searchFunds",
              toolCallId: toolPart.toolCallId,
              output: { results: [], error: "Couldn't reach the fund database." },
            });
          });
      }
    }
  }, [messages, addToolOutput]);

  function handleConfirmSetup(toolCallId: string, proposed: { profile?: ProposedProfile; goals: ProposedGoal[] }) {
    if (proposed.profile) {
      const { debts: proposedDebts, ...profileFields } = proposed.profile;
      saveProfile({
        ...profile,
        ...profileFields,
        dependents: profile?.dependents ?? [],
        // The AI's debts list, if it gave one, replaces the stored list outright
        // (its own instructions tell it to include already-known debts when
        // adding a new one, so this isn't meant to be a partial patch) —
        // falls back to whatever's already saved if it didn't mention debts.
        debts: proposedDebts ? proposedDebts.map((d): Debt => ({ id: newId(), ...d })) : (profile?.debts ?? []),
        hasHealthInsurance: profile?.hasHealthInsurance ?? false,
        hasTermLifeInsurance: profile?.hasTermLifeInsurance ?? false,
        monthlyCaregivingExpenses: profile?.monthlyCaregivingExpenses ?? 0,
        city: profile?.city ?? "",
      });
    }

    const goalsAdded: string[] = [];
    const goalsUpdated: string[] = [];
    const goalIds: string[] = [];
    for (const goal of proposed.goals) {
      const preset = getPreset(goal.presetKey);
      const goalInput: GoalInput = {
        name: goal.name,
        presetKey: goal.presetKey,
        targetAmountToday: goal.targetAmountToday,
        years: goal.years,
        existingSavings: goal.existingSavings,
        inflationPct: preset.defaultInflationPct,
        expectedReturnPct: 12,
        loanAmount: goal.loanAmount,
        loanRatePct: goal.loanRatePct,
        loanYears: goal.loanYears,
      };
      // Only treat it as an edit if that id genuinely exists — a model
      // hallucinating or misremembering an id should still safely create a
      // new goal rather than silently no-op against a nonexistent one.
      const existing = goal.id ? goals.find((g) => g.id === goal.id) : undefined;
      if (existing) {
        updateGoal(existing.id, goalInput);
        goalsUpdated.push(goal.name);
        goalIds.push(existing.id);
      } else {
        const saved = saveGoal(goalInput);
        goalsAdded.push(goal.name);
        goalIds.push(saved.id);
      }
    }
    addToolOutput({
      tool: "proposeFinancialSetup",
      toolCallId,
      output: { confirmed: true, goalsAdded, goalsUpdated, goalIds },
    });
  }

  function handleDeclineSetup(toolCallId: string) {
    addToolOutput({ tool: "proposeFinancialSetup", toolCallId, output: { confirmed: false } });
  }

  async function handleConfirmPlan(toolCallId: string, proposed: ProposedPlan) {
    setSavingPlanCallId(toolCallId);
    try {
      const plan = buildScratchPlan({
        years: proposed.years,
        expectedReturn: proposed.expectedReturnPct,
        events: (start) => [
          proposed.kind === "sip"
            ? { id: newId(), type: "SIP_START", date: start, amount: proposed.amount, label: "Monthly SIP" }
            : { id: newId(), type: "LUMPSUM", date: start, amount: proposed.amount, label: "One-time investment" },
        ],
      });
      const saved = await createPlan({ name: proposed.name, planType: "wealth", plan });
      addToolOutput({ tool: "proposePlan", toolCallId, output: { confirmed: true, planName: saved.name, planId: saved.id } });
    } catch {
      // Leave the confirm card up (don't call addToolOutput) so Confirm is
      // still there to retry — a network blip shouldn't force redoing the
      // whole exchange with the model.
      toast.error("Couldn't save this plan — check your connection and try again.");
    } finally {
      setSavingPlanCallId(null);
    }
  }

  function handleDeclinePlan(toolCallId: string) {
    addToolOutput({ tool: "proposePlan", toolCallId, output: { confirmed: false } });
  }

  function handleSingleChoice(toolCallId: string, option: string) {
    addToolOutput({ tool: "askChoice", toolCallId, output: { selected: [option] } });
  }

  function toggleMultiChoiceOption(toolCallId: string, option: string) {
    setPendingMultiChoice((prev) => {
      const current = new Set(prev[toolCallId] ?? []);
      if (current.has(option)) current.delete(option);
      else current.add(option);
      return { ...prev, [toolCallId]: current };
    });
  }

  function submitMultiChoice(toolCallId: string) {
    const selected = [...(pendingMultiChoice[toolCallId] ?? [])];
    addToolOutput({ tool: "askChoice", toolCallId, output: { selected } });
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setInput(transcript.slice(0, MAX_MESSAGE_LENGTH));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (containsProfanity(trimmed)) {
      setBlockedMessage("Let's keep this civil — try rephrasing without the language.");
      return;
    }
    setBlockedMessage(null);
    setErrorMessage(null);
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    {/* Messages */}
    <div
      className={cn(
        "min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3",
        "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
        messagesClassName
      )}
    >
      {messages.length === 0 && (
        <div className="grid gap-2">
          <div className="max-w-[88%] rounded-xl border bg-muted/40 px-3.5 py-3 text-sm leading-relaxed">
            <p>
              Hi! Tell me about your income, expenses, and goals and I can set
              them up for you — or ask me anything about your numbers.
            </p>
          </div>

          <div className="grid gap-1.5">
            <div className="relative overflow-hidden rounded-xl border bg-background">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${activePromptIndex * 100}%)` }}
              >
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="w-full shrink-0 px-8 py-3 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => goToPrompt(activePromptIndex - 1)}
                aria-label="Previous example"
                className="absolute left-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-primary"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => goToPrompt(activePromptIndex + 1)}
                aria-label="Next example"
                className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-primary"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => goToPrompt(i)}
                  aria-label={`Show example ${i + 1} of ${EXAMPLE_PROMPTS.length}`}
                  aria-current={i === activePromptIndex}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    i === activePromptIndex ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
            message.role === "user"
              ? "ml-auto bg-primary text-primary-foreground"
              : "border bg-muted/40"
          )}
        >
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              // The user's own text is rendered as plain text — no reason to
              // interpret a literal "*" or "#" they typed as markdown syntax.
              return message.role === "user" ? (
                <p key={i} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              ) : (
                <Markdown key={i} text={part.text} />
              );
            }

            if (part.type === "tool-proposeFinancialSetup") {
              const toolPart = part as {
                type: string;
                state: string;
                toolCallId: string;
                input?: {
                  profile?: ProposedProfile;
                  goals: ProposedGoal[];
                };
                output?: {
                  confirmed: boolean;
                  goalsAdded?: string[];
                  goalsUpdated?: string[];
                  goalIds?: string[];
                };
              };

              if (toolPart.state === "input-available" && toolPart.input) {
                const {
                  profile: proposedProfile,
                  goals: proposedGoals,
                } = toolPart.input;

                return (
                  <div
                    key={i}
                    className="mt-2 grid gap-2.5 rounded-xl border bg-background p-3 text-sm"
                  >
                    <p className="font-medium">
                      Here&apos;s what I&apos;ll create — confirm?
                    </p>

                    {proposedProfile && (
                      <div className="grid gap-1.5 rounded-lg border bg-muted/40 p-2.5 text-xs">
                        <p className="mb-1 font-medium text-foreground">
                          Financial profile
                        </p>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Monthly income
                          </span>
                          <span>
                            {formatINR(proposedProfile.monthlyIncome)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Monthly expenses
                          </span>
                          <span>
                            {formatINR(proposedProfile.monthlyExpenses)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Emergency fund saved
                          </span>
                          <span>
                            {formatINR(proposedProfile.emergencyFundSaved)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Risk tolerance
                          </span>
                          <span className="capitalize">
                            {proposedProfile.riskTolerance}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-1.5 rounded-lg border bg-muted/40 p-2.5 text-xs">
                      <p className="mb-1 font-medium text-foreground">
                        Goals
                      </p>

                      {proposedGoals.map((g, gi) => {
                        const hasLoan = g.loanAmount != null && g.loanRatePct != null && g.loanYears != null;
                        const emi = hasLoan ? computeEmi(g.loanAmount!, g.loanRatePct!, g.loanYears!).emi : null;
                        return (
                          <div key={gi} className="grid gap-0.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
                                {g.name || getPreset(g.presetKey).label}
                                {g.id && (
                                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    editing
                                  </span>
                                )}
                              </span>

                              <span className="shrink-0">
                                {formatINR(g.targetAmountToday)} in {g.years} yrs
                              </span>
                            </div>
                            {hasLoan && emi != null && (
                              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                                <span className="min-w-0 truncate">
                                  + {formatINR(g.loanAmount!)} loan, {g.loanRatePct}% for {g.loanYears} yrs
                                </span>
                                <span className="shrink-0">{formatINR(emi)}/mo EMI</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          handleConfirmSetup(toolPart.toolCallId, {
                            profile: proposedProfile,
                            goals: proposedGoals,
                          })
                        }
                      >
                        Confirm
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDeclineSetup(toolPart.toolCallId)
                        }
                      >
                        Not now
                      </Button>
                    </div>
                  </div>
                );
              }

              if (toolPart.state === "output-available") {
                const added = toolPart.output?.goalsAdded?.length ?? 0;
                const updated = toolPart.output?.goalsUpdated?.length ?? 0;
                const parts = [
                  added > 0 ? `${added} goal${added === 1 ? "" : "s"} added` : null,
                  updated > 0 ? `${updated} goal${updated === 1 ? "" : "s"} updated` : null,
                ].filter(Boolean);
                const goalIds = toolPart.output?.goalIds ?? [];
                return (
                  <div key={i}>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {toolPart.output?.confirmed
                        ? `Saved — ${parts.length ? parts.join(", ") : "profile updated"}. Check Financial Profile / Goal Planner to review or adjust anything.`
                        : "No changes made — let me know what you'd like instead."}
                    </p>
                    {toolPart.output?.confirmed && (
                      <ResultLink
                        label="View in Goal Planner"
                        onClick={() => navigateApp({ kind: "goals", focusGoalId: goalIds.length === 1 ? goalIds[0] : undefined })}
                      />
                    )}
                  </div>
                );
              }

              return (
                <p
                  key={i}
                  className="mt-2 text-xs text-muted-foreground"
                >
                  Preparing a setup to review…
                </p>
              );
            }

            if (part.type === "tool-proposePlan") {
              const toolPart = part as {
                type: string;
                state: string;
                toolCallId: string;
                input?: ProposedPlan;
                output?: { confirmed: boolean; planName?: string; planId?: string };
              };

              if (toolPart.state === "input-available" && toolPart.input) {
                const p = toolPart.input;
                return (
                  <div key={i} className="mt-2 grid gap-2.5 rounded-xl border bg-background p-3 text-sm">
                    <p className="font-medium">Here&apos;s the plan I&apos;ll create — confirm?</p>
                    <div className="grid gap-1.5 rounded-lg border bg-muted/40 p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-muted-foreground">{p.name}</span>
                        <span className="shrink-0">{p.kind === "sip" ? `${formatINR(p.amount)}/mo` : formatINR(p.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{p.years} yrs</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Expected return</span>
                        <span>{p.expectedReturnPct}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingPlanCallId === toolPart.toolCallId}
                        onClick={() => handleConfirmPlan(toolPart.toolCallId, p)}
                      >
                        {savingPlanCallId === toolPart.toolCallId ? "Saving…" : "Confirm"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingPlanCallId === toolPart.toolCallId}
                        onClick={() => handleDeclinePlan(toolPart.toolCallId)}
                      >
                        Not now
                      </Button>
                    </div>
                  </div>
                );
              }

              if (toolPart.state === "output-available") {
                const planId = toolPart.output?.planId;
                return (
                  <div key={i}>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {toolPart.output?.confirmed
                        ? `Saved "${toolPart.output.planName}" to My Plans.`
                        : "No changes made — let me know what you'd like instead."}
                    </p>
                    {toolPart.output?.confirmed && planId && (
                      <ResultLink label="View Plan" onClick={() => navigateApp({ kind: "plan", id: planId })} />
                    )}
                  </div>
                );
              }

              return (
                <p key={i} className="mt-2 text-xs text-muted-foreground">
                  Preparing a plan to review…
                </p>
              );
            }

            if (part.type === "tool-askChoice") {
              const toolPart = part as {
                type: string;
                state: string;
                toolCallId: string;
                input?: ProposedChoice;
                output?: { selected: string[] };
              };

              if (toolPart.state === "input-available" && toolPart.input) {
                const q = toolPart.input;
                const selectedSet = pendingMultiChoice[toolPart.toolCallId] ?? new Set<string>();
                return (
                  <div key={i} className="mt-2 grid gap-2.5 rounded-xl border bg-background p-3 text-sm">
                    <p className="font-medium">{q.question}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((option) =>
                        q.mode === "single" ? (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSingleChoice(toolPart.toolCallId, option)}
                            className="rounded-full border px-3 py-1 text-xs transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                          >
                            {option}
                          </button>
                        ) : (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleMultiChoiceOption(toolPart.toolCallId, option)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition-colors",
                              selectedSet.has(option)
                                ? "border-primary bg-primary/10 text-primary"
                                : "hover:border-primary hover:bg-primary/5 hover:text-primary"
                            )}
                          >
                            {option}
                          </button>
                        )
                      )}
                    </div>
                    {q.mode === "multi" && (
                      <Button
                        type="button"
                        size="sm"
                        className="w-fit"
                        disabled={selectedSet.size === 0}
                        onClick={() => submitMultiChoice(toolPart.toolCallId)}
                      >
                        Submit
                      </Button>
                    )}
                  </div>
                );
              }

              if (toolPart.state === "output-available") {
                return (
                  <p key={i} className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    You picked: {toolPart.output?.selected?.join(", ") || "nothing"}
                  </p>
                );
              }

              return (
                <p key={i} className="mt-2 text-xs text-muted-foreground">
                  Preparing a question…
                </p>
              );
            }

            if (part.type.startsWith("tool-")) {
              const toolPart = part as {
                type: string;
                state: string;
                input?: Record<string, unknown>;
                output?: Record<string, unknown>;
              };

              // These are quick internal calculations (calculateSip, calculateEmi,
              // calculateFd/Ppf/Rd, suggestAdjustments) whose result the reply text
              // already states in plain language — the raw JSON underneath added
              // nothing for a person reading the chat, so it's not shown at all.
              // The calculator ones do get a link through to the matching Tools
              // page, pre-filled with these same numbers, since that page can
              // actually do more with them (charts, year-by-year tables) than a
              // one-line chat reply can.
              if (toolPart.state === "output-available") {
                const label = CALC_TOOL_LABELS[toolPart.type];
                const view = label ? calcToolView(toolPart.type, toolPart.input, toolPart.output) : null;
                if (!view) return null;
                return <ResultLink key={i} label={`Open in ${label}`} onClick={() => navigateApp(view)} />;
              }

              if (toolPart.state === "output-error") {
                return (
                  <p
                    key={i}
                    className="mt-2 text-xs text-negative"
                  >
                    That calculation didn&apos;t go through — try
                    rephrasing.
                  </p>
                );
              }

              return (
                <p
                  key={i}
                  className="mt-2 text-xs text-muted-foreground"
                >
                  Calculating…
                </p>
              );
            }

            return null;
          })}
        </div>
      ))}

      {chatStatus === "submitted" && (
        <div className="flex max-w-[88%] items-center gap-1.5 rounded-xl border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current" />
        </div>
      )}

      {errorMessage && (
        <p className="px-1 text-xs text-negative">
          {errorMessage}
        </p>
      )}
    </div>

    {/* Composer */}
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t bg-background px-3 py-3"
    >
      {quotaExhausted && (
        <p className="mb-1.5 rounded-lg border border-negative/30 bg-negative/5 px-2.5 py-2 text-xs text-negative">
          You&apos;ve used today&apos;s free AI messages — opening in {formatCountdown(nextUtcMidnight() - countdownNow)}.
        </p>
      )}
      {blockedMessage && (
        <p className="mb-1.5 px-1 text-xs text-negative">{blockedMessage}</p>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (blockedMessage) setBlockedMessage(null);
          }}
          placeholder={listening ? "Listening…" : quotaExhausted ? "Come back once the quota resets…" : "Ask about your plan…"}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={
            chatStatus === "streaming" ||
            chatStatus === "submitted" ||
            quotaExhausted
          }
          autoFocus
          ref={inputRef}
          className="h-10 rounded-lg bg-background"
        />

        {voiceSupported && (
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            size="icon"
            className="size-10 shrink-0 rounded-lg"
            disabled={chatStatus === "streaming" || chatStatus === "submitted" || quotaExhausted}
            onClick={toggleListening}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? <Square className="size-3.5" /> : <Mic className="size-4" />}
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-lg"
          disabled={
            !input.trim() ||
            chatStatus === "streaming" ||
            chatStatus === "submitted" ||
            quotaExhausted
          }
          aria-label="Send"
        >
          <Send className="size-4" />
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex items-center gap-1 hover:text-foreground hover:underline"
            >
              <Trash2 className="size-2.5" />
              Clear chat
            </button>
          )}
          {quota && (
            <span className={cn("tabular-nums", quota.remaining === 0 && "text-negative")}>
              {quota.remaining}/{quota.limit} left today
            </span>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            input.length >= MAX_MESSAGE_LENGTH && "text-negative"
          )}
        >
          {input.length}/{MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </form>
  </div>
);
}
