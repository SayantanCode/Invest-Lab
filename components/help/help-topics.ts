// Plain content, kept separate from rendering — same convention as
// lib/goals/goal-presets.ts. Every answer here should be checkable against the
// actual behavior of the feature it describes; nothing speculative.

export interface HelpTopic {
  section: string;
  question: string;
  answer: string;
}

export const HELP_TOPICS: HelpTopic[] = [
  // Getting started
  {
    section: "Getting started",
    question: "I don't know where to start — what should I do first?",
    answer:
      "Use the guided setup (the \"Let's build your investment plan\" card on the Dashboard, or from Help below) — it asks a handful of simple questions and builds a real plan for you. Or go straight to Goal Planner if you already know what you're saving for.",
  },
  {
    section: "Getting started",
    question: "Is this really free? What's the catch?",
    answer:
      "No catch. Everything runs in your browser — plans are stored locally by default. Signing in with Google is optional and only adds cross-device sync, nothing is paywalled.",
  },

  // Plans
  {
    section: "Plans",
    question: "What's the difference between Simple and Advanced plan editing?",
    answer:
      "Simple mode is one SIP with an optional annual step-up — good for \"just start investing.\" Advanced mode exposes the full event timeline: step-ups, pauses, resumes, lumpsums, withdrawals, and (for multi-fund plans) per-fund allocations — good for modeling a real, messy investing history.",
  },
  {
    section: "Plans",
    question: "What do Conservative / Expected / Optimistic mean on the chart?",
    answer:
      "Three return assumptions run through the same event timeline. Expected is your stated assumption; Conservative and Optimistic are a band around it, mostly so you don't anchor on one number as if it were guaranteed.",
  },
  {
    section: "Plans",
    question: "What events can I add to a plan?",
    answer:
      "SIP Start, Step-up (by % or to a new amount), Pause, Resume, Lumpsum, Withdrawal, SWP Start, and SWP Stop — the same event types a real investing history actually has.",
  },
  {
    section: "Plans",
    question: "Can I back up or move a plan?",
    answer:
      "Yes — Export on any plan downloads it as JSON; Import (top of the app) brings a plan back in, on this device or another.",
  },

  // Goals
  {
    section: "Goals",
    question: "How does the Goal Planner turn a target into a monthly number?",
    answer:
      "It inflates your target to what it'll actually cost by your deadline, credits whatever you've already saved (grown at your expected return), and solves backward for the monthly SIP that closes the remaining gap — a standard annuity calculation, not a guess.",
  },
  {
    section: "Goals",
    question: "What does the goal timeline actually tell me?",
    answer:
      "If your goals together need more than your monthly surplus, the timeline shows a realistic order instead of just flagging a conflict — shorter-horizon goals get priority (they have less room to make up a late start), and it's honest when a goal simply doesn't fit within 50 years at your current numbers.",
  },
  {
    section: "Goals",
    question: "Why did my goal's target amount change when I picked a city?",
    answer:
      "Home, vehicle, and marriage costs vary a lot by city, so those presets nudge toward a realistic local figure once your Profile has a city set. Every other goal type stays at the national-average default — you can always type over it either way.",
  },
  {
    section: "Goals",
    question: "What happens when I click \"Create a plan\" on a goal?",
    answer:
      "It builds a real Advanced-mode plan seeded with the right SIP and duration, so you can then pick actual funds for it — the goal and the plan stay independent after that; editing one doesn't change the other.",
  },

  // Financial Profile
  {
    section: "Financial Profile",
    question: "What order does the Profile check things in?",
    answer:
      "Emergency fund, then health insurance, then term insurance (if you have dependents), then any high-interest debt, then whether your goals fit your surplus — the standard order a financial planner would use, protect first, then invest.",
  },
  {
    section: "Financial Profile",
    question: "How is my monthly surplus calculated?",
    answer:
      "Income minus living expenses minus caregiving costs minus EMIs on any debts you've listed. That's the true ceiling on any new SIP.",
  },
  {
    section: "Financial Profile",
    question: "Where do the insurance cover recommendations come from?",
    answer:
      "Rough rules of thumb, not advice: roughly ₹5L of health cover per household member, and roughly 12x your annual income for term life. Real adequacy depends on your city, health, and existing assets — treat these as a starting point to check, not a target to hit exactly.",
  },
  {
    section: "Financial Profile",
    question: "Why does adding a parent as a dependent change anything?",
    answer:
      "It's the only thing that surfaces a caregiving-cost nudge — parents' medical costs tend to be lumpy and easy to under-budget, so the app flags it separately instead of letting it hide inside a single expenses number.",
  },

  // Analyze
  {
    section: "Analyze",
    question: "What's the difference between Historical Analysis and a regular plan?",
    answer:
      "A regular plan uses a stated return assumption. Historical Analysis replays the same event timeline against a real fund's actual traded NAV history — what your SIP would genuinely have been worth, not a projection.",
  },
  {
    section: "Analyze",
    question: "What does Scenario Lab do?",
    answer:
      "Puts your saved plans side by side so you can see which one actually gets you further, instead of opening them one at a time.",
  },
  {
    section: "Analyze",
    question: "What does Portfolio Analyzer show that a single plan doesn't?",
    answer:
      "Fund-level exposure across every plan you've saved — which real fund you're most concentrated in, combining multi-fund plans and single-fund plans into one view. It doesn't claim overlap detection (that needs stock-level holdings data this app doesn't have), just honest exposure and concentration.",
  },

  // Tools
  {
    section: "Tools",
    question: "Why can SIP, Lumpsum, and SWP calculators \"Save as Plan\" but the others can't?",
    answer:
      "Those three are market-linked — they naturally have a return band (Conservative/Expected/Optimistic). EPF, PPF, FD, RD, EMI, GST, and XIRR are either fixed-rate instruments or pure arithmetic with no scenario to model, so turning them into a \"plan\" would fabricate a band that doesn't mean anything.",
  },
  {
    section: "Tools",
    question: "Are the PPF/EPF/FD/RD interest rates live?",
    answer:
      "No — they're editable defaults, not a live feed. Rates change (PPF and EPF are revised periodically by the government), so check the current declared rate and adjust the slider.",
  },
  {
    section: "Tools",
    question: "What's the XIRR calculator for?",
    answer:
      "Working out the real annualized return of any series of dated cashflows — useful for a fund you've been adding to and withdrawing from irregularly, where a simple return % doesn't capture the timing.",
  },

  // Data & privacy
  {
    section: "Data & privacy",
    question: "Where is my data stored?",
    answer:
      "In your browser's local storage by default — nothing leaves your device unless you sign in with Google, which syncs plans to a database so they follow you across devices.",
  },
  {
    section: "Data & privacy",
    question: "What external services does this app actually call?",
    answer:
      "mfapi.in for real mutual fund NAV history (itself built on AMFI's published feed), and TradingView's free embed for the market snapshot widget. Nothing else — no analytics, no ad trackers.",
  },
];

export const HELP_SECTIONS = Array.from(new Set(HELP_TOPICS.map((t) => t.section)));
