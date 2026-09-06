# InvestLab

**Model your money before you invest it.** A free, ₹0-cost, privacy-first investment simulation app for India — SIPs, lumpsums, EPF/EPS, PPF, FDs, RDs, EMIs, GST, goal planning, historical backtesting, and multi-fund portfolios, all built on one shared, auditable math engine.

> If you're reading this to get oriented before writing code, read it in order — the architecture section explains *why* the codebase is shaped the way it is, not just what's in each folder.

---

## Table of contents

1. [Why InvestLab exists](#why-investlab-exists)
2. [What makes it strong](#what-makes-it-strong)
3. [What's deliberately left out](#whats-deliberately-left-out-and-why)
4. [How it compares to typical calculators](#how-it-compares-to-typical-calculators)
5. [Tech stack](#tech-stack)
6. [Architecture](#architecture)
7. [Directory map](#directory-map)
8. [Feature catalog](#feature-catalog)
9. [Worked examples](#worked-examples)
10. [Extending the app — for developers](#extending-the-app--for-developers)
11. [Running it locally](#running-it-locally)
12. [House style / conventions](#house-style--conventions)

---

## Why InvestLab exists

Most Indian investors work out whether a plan is realistic using a scattered pile of single-purpose calculators — a bank's FD widget, a broker's SIP page, a blog's EPF spreadsheet — each with its own math, its own assumptions, and no memory of what you calculated five minutes ago on a different tool. None of them talk to each other. None of them show their work. And most are funded, directly or indirectly, by the same institutions selling the products they're "calculating" — which is not an accusation of dishonesty, just a structural reason their default assumptions tend to look flattering rather than realistic.

InvestLab's motive is narrow and specific: **put every common Indian personal-finance calculation behind one transparent, consistent, free tool**, so a real financial decision — how much to invest, for how long, in what, and what to actually expect — can be modeled once and examined from every angle (a saved plan, a goal, a scenario comparison, a real historical backtest, a multi-fund portfolio) without re-entering numbers into five different sites and reconciling five different sets of assumptions by hand.

It exists to make the *thinking* behind an investment easier to do correctly, not to sell, recommend, or execute one.

## What makes it strong

- **One shared math engine, not five reimplementations.** SIP, Lumpsum, SWP, Goal Planner, Scenario Lab, Historical Analysis, and Portfolio Analyzer all run through the same `lib/engine` replay loop (see [Architecture](#architecture)). A fix or improvement to how compounding, dates, or returns are computed lands everywhere at once — and a real example: earlier in this project's life, a date-arithmetic bug in the shared engine was traced and fixed once, and every feature that used it (SIP, Historical, Scenario Lab, Goal-adjacent calculators) became correct simultaneously. That's the payoff of centralizing the math instead of copy-pasting a formula into each new calculator.
- **Real historical NAV replay, not just an assumed CAGR.** Historical Analysis replays your exact contribution schedule against real traded NAV sourced from a public community API (mfapi.in, itself built on AMFI's published NAV feed) — so you see what a plan would have *actually* returned, weekends/holidays and all, not a smoothed guess.
- **India-specific granularity most calculators skip or conflate.** EPF (a compounding savings corpus) and EPS (a defined-benefit pension formula) are modeled as the genuinely separate schemes they are in law, with the ₹15,000 pensionable-salary cap and the real ±4%/year early/deferred pension adjustment — many public calculators just show one number and call it "EPF." FD/RD use quarterly compounding to match real Indian bank conventions rather than a generic annual-compounding shortcut. A "Direct vs Regular" fund comparison models the actual daily expense-ratio drag between plan types instead of a rough annual haircut.
- **Every plan is one object, examined five ways.** A `Plan` you build once can be run through the expected-return simulator, the conservative/optimistic scenario band, a real historical backtest, and — if it's a multi-fund portfolio — a per-fund breakdown, without re-entering a single number.
- **Local-first, cloud-optional.** Every plan lives in your browser (`localStorage`) by default. Nothing is sent anywhere unless you choose to sign in, and even then sync is a one-time opt-in import, not a silent background upload (see [Storage & sync](#storage--sync)).
- **Transparent, auditable methodology.** Every non-obvious formula in this codebase carries a comment explaining *why* it's built that way, not just what it computes — and the UI itself shows the actual month-by-month ledger a plan produces, not just a headline number, so a result can be checked rather than trusted.
- **Free forever, no ads, no data resale, no AUM incentive.** Because it isn't funded by commissions on the products it models, there's no structural pressure to bias a default assumption upward to make a plan look more attractive than it is.

## What's deliberately left out (and why)

- **No real money movement, brokerage integration, or KYC.** InvestLab is a simulator, full stop — it never touches an actual account or executes an actual trade. That's not a missing feature; it's what keeps this a free tool anyone can use without licensing, custody, or compliance obligations.
- **No tax computation.** Capital-gains rules change most budgets and depend on instrument type, holding period, and an investor's own slab — baking in an assumption that's wrong (or stale) is worse than being transparent that tax isn't modeled here.
- **No AI-predicted market returns.** The built-in AI assistant explains and summarizes; it never forecasts a return for you. Every return assumption in every calculator is a number *you* choose, on purpose, to avoid lending false authority to a guess.
- **EPFO's 2023 "higher pension" opt-in isn't modeled.** It's a genuine opt-in scheme with its own extra-contribution mechanics, distinct enough from the statutory default that guessing at it would be worse than noting it's out of scope (the EPF Calculator's own copy says so explicitly).
- **No mobile app.** Web-first and responsive, deliberately, rather than splitting effort across native codebases before the web app itself is done.
- **India-only, single currency.** Depth over breadth — every India-specific rule above takes real effort to get right, and diluting that across other countries' tax/instrument regimes wasn't worth doing shallowly.

## How it compares to typical calculators

| | Typical single-purpose calculator | InvestLab |
| --- | --- | --- |
| Return assumption | One fixed number, no sensitivity shown | Conservative / Expected / Optimistic scenario band on every projection |
| EPF vs EPS | Usually conflated into one "EPF" figure | Modeled as the two distinct legal schemes they are, each with its own card |
| Historical accuracy | CAGR assumption only | Real traded NAV replay, weekends/holidays and all |
| Cross-tool consistency | Every site has its own formula | One shared engine — the same math, everywhere |
| Data | Sent to whoever runs the site | Stays in your browser unless you opt into sync |
| Cost / incentive | Often AMC/broker-funded | Free, no ads, nothing to sell |
| Salary growth | Usually a single flat "increment %" | Four modeled career trajectory shapes (steady, S-curve, promotion-step, peak-and-decline) |

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (Radix primitives) + Ant Design v6 (via `@ant-design/nextjs-registry`) |
| Charts | Recharts |
| Auth | NextAuth v5 (beta) — Google OAuth + email/password (custom OTP signup/reset) |
| Database | MongoDB — native driver (for the Auth.js adapter) + Mongoose (for app data), used side by side deliberately (see [Storage & sync](#storage--sync)) |
| AI assistant | Google Gemini via the Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) |
| PDF export | `@react-pdf/renderer` |
| Password hashing | bcryptjs |

## Architecture

### One route for the app, not many pages

This is not a typical multi-route Next.js app. Every "page" you see inside the app itself — Dashboard, My Plans, every Tool calculator, Settings, Historical Analysis, all of it — is a conditional render off a single `View` discriminated union held in `React.useState` at the top of `app/page.tsx`, not a separate route:

```ts
export type View =
  | { kind: "dashboard" }
  | { kind: "plans" }
  | { kind: "plan"; id: string }
  | { kind: "tools-sip" }
  | { kind: "tools-epf" }
  // …every other section, same shape
```

The `View` type itself lives in `lib/app-view.ts` (re-exported from `app/page.tsx`) so non-page code — like `lib/stores/use-app-navigate-store.ts` — can reference it without importing a client page component.

The sidebar (`components/app-sidebar.tsx`) never uses `next/link` or `router.push` for a `View` item — clicking one just calls `setView(...)`. The upside is instant, state-preserving navigation with no route-transition flash. The cost is that Next.js's own router-driven behaviors (scroll reset on navigation, back/forward URL history) don't come for free and have to be built by hand where they matter — `app/page.tsx` has an explicit `useEffect` that resets scroll to top on every `view` change for exactly this reason. **If you're adding a new top-level section, add a new `View["kind"]` to `lib/app-view.ts` and a new conditional render in `app/page.tsx`, not a new `app/<name>/page.tsx` route.**

A handful of *genuinely separate* routes do exist alongside this shell, and are deliberately not part of the `View` system: `/privacy-policy` (its own standalone page, with its own header — a privacy policy is exactly the kind of page that should survive independently of app state and be linkable/indexable on its own), the App Router's special files (`not-found.tsx`, `error.tsx`, `global-error.tsx`, `icon.tsx`/`apple-icon.tsx`/`opengraph-image.tsx`, `robots.ts`/`sitemap.ts`/`manifest.ts`), and every `app/api/*` route handler. None of those are "a page" the sidebar navigates to — they're either infrastructure the browser/crawlers hit directly, or (for `/privacy-policy`) a page reached by a real `next/link` on purpose, precisely so the browser back button behaves normally after visiting it.

### `lib/engine/` — the simulation core

Everything that isn't a closed-form standalone formula (see the [feature catalog](#feature-catalog) for which tools are which) runs through this folder. It's deliberately framework-free — no React import anywhere in it — so the same code could run in a Node script or a future backend job, not just the browser.

- **`types.ts`** — the domain model. A `Plan` is `{id, name, startDate, endDate, events, assumptions, historicalScheme?, allocations?}`. `events` is an array of `PlanEvent`, a discriminated union over `SIP_START | SIP_STEPUP | SIP_PAUSE | SIP_RESUME | SIP_STOP | LUMPSUM | WITHDRAWAL | SWP_START | SWP_STOP`. A plan is a sequence of *events*, not a pre-baked schedule — the engine derives the schedule by replaying them.
- **`date.ts`** — dependency-free, UTC-anchored date arithmetic. `monthRange(start, end)` generates the plan's monthly walk; `addMonthsUTC` clamps day-of-month instead of letting JS's native `setUTCMonth` silently overflow into the wrong month on short months (Aug 31 + 1 month landing on Oct 1 instead of Sep 30, say) — this exact bug once caused every projection starting on a 29th–31st to quietly under-count a month of growth for the whole plan, until it was traced and fixed at this one shared source.
- **`replay.ts`** — the actual month-by-month simulation loop. `replayMonths` buckets events by month, buys/sells "units" against whatever price a `priceAt(date)` resolver returns for that month, and builds a `LedgerRow[]`. `runReplay` wraps that with `extendToTargetEnd` (one final valuation-only row so the corpus keeps growing all the way to the plan's real end date — the annuity-due convention every serious SIP calculator uses) and `computeReturns` (turns the ledger into nominal + inflation-adjusted XIRR and absolute-return figures).
- **`forecast-price-resolver.ts`** — Forecast mode's synthetic NAV curve: a smooth deterministic `BASE_NAV × (1+r)^(monthsElapsed/12)`, not a random walk, driven by a scenario's annual-return assumption.
- **`historical-price-resolver.ts`** / **`historical-replay.ts`** — real-NAV lookup (binary search + forward-fill across weekends/holidays) and the historical-mode replay that uses it instead of the synthetic curve.
- **`historical-forecast.ts`** — bridges historical and forecast: a plan that starts in the past and runs into the future (or is entirely future-dated) gets real NAV where it exists and a projected continuation, seeded by the fund's own trailing CAGR, past that.
- **`xirr.ts`** — Newton-Raphson solver (with a bisection fallback) for the annualized return of any dated cashflow series — this is also what powers the standalone XIRR Calculator directly.
- **`portfolio-replay.ts`** — a multi-fund `Plan` (2+ `allocations`) is run as N *independent* single-fund replays, each scaled to its `weightPct` via `scale-plan.ts`, then merged row-by-row. Deliberately not a rewrite of the core loop — weighted-SIP allocation has no cross-fund interaction to model.
- **`direct-vs-regular.ts`** — derives a synthetic "Regular plan" NAV series from real Direct-plan NAV by applying a continuous daily expense-ratio drag, so the cost of a Regular plan's higher expense ratio is shown as an actual rupee gap, not an asserted percentage.
- **`inflation.ts`**, **`scale-plan.ts`** — small, self-contained helpers used by the above.
- **`index.ts`** — the public barrel; import from `@/lib/engine`, not individual files, from outside this folder.

`lib/goals/compute-plan-results.ts` is the shared entry point everything else calls: `computePlanResults(plan)` runs `simulateAllScenarios` for a single-fund plan, or the portfolio path for a multi-fund one, and hands back all three scenario results.

### Why `lib/` is split by feature, not by file type

Everything under `lib/` (other than `engine/`) is grouped by what it's *for*, not what kind of file it is: `calculators/` holds pure financial math (every standalone closed-form calculator, plus `goal-calc.ts`'s reverse-SIP solve) — no React, nothing engine-specific. `stores/` holds every client-side `useSyncExternalStore` hook (plans, goals, profile, net worth, onboarding, activity log, small UI preferences like the dashboard's pinned-plan choice). `goals/` holds Plan/Goal *domain composition* — building a scratch or goal-derived `Plan`, computing its results, deriving chart data — the layer that sits between raw engine math and the UI. `server/` holds everything that only runs server-side: auth, both DB connections, email, rate limiting. Eight true cross-cutting generics (`format.ts`, `id.ts`, `utils.ts`, `download.ts`, `profanity-filter.ts`, `app-view.ts`, `site-config.ts`, `password-policy.ts`) stay at `lib/`'s root because they don't belong to any one feature — pulling any of them into a feature folder would just make the other three feature folders import sideways from it. `lib/engine/` stays its own top-level folder rather than living inside `goals/`, because it's the one piece disciplined enough to have zero dependency on anything else in this app — worth keeping visibly separate.

### Data flow

```text
Plan (events + assumptions)
      │
      ▼
computePlanResults()          ← lib/goals/compute-plan-results.ts
      │
      ▼
simulate() × 3 scenarios      ← lib/engine/replay.ts (+ resolver)
      │
      ▼
SimulationResult { ledger, finalValue, xirrPct, … }
      │
      ├──► ValueChart / BreakdownDonut / SummaryCards   (components/plan/)
      ├──► LedgerTable                                   (components/plan/ledger-table.tsx)
      └──► ExportReportPage → PDF                         (lib/report/report-document.tsx)
```

Every calculator that isn't a closed-form standalone tool builds a throwaway `Plan` via `lib/goals/build-scratch-plan.ts` and pushes it through this exact same pipeline — a SIP Calculator run and a saved Plan's projection are, underneath, the same function call.

### Storage & sync

There is no live two-way sync. `lib/stores/use-plans-store.ts` hard-branches on auth status into two independent stores behind one hook:

- **Signed out** → plans live in `localStorage` (`investlab.plans.v1`), read/written synchronously.
- **Signed in** → plans live in MongoDB, fetched once and cached (`GET /api/plans`), mutated via `POST`/`PATCH`/`DELETE` on `/api/plans[/:id]`.

The bridge between the two is a **one-time, explicit import**, not a background sync: `components/auth/import-prompt.tsx` detects the transition to signed-in, and — if `localStorage` has plans and the user hasn't been asked before — offers to bulk-import them into MongoDB. The user's local copy is left untouched either way. There is deliberately no conflict resolution, because there's nothing to resolve: import is additive and one-shot, and once signed in, local plans simply aren't read again until the user signs out.

The database layer is a genuine hybrid, on purpose: `lib/server/mongodb.ts` holds a cached **native MongoDB driver** connection, used *only* because `@auth/mongodb-adapter` (NextAuth's session/account/user storage) requires it directly. Every application-level collection — plans, activity log, local credentials — goes through `lib/server/mongoose.ts`'s separate cached Mongoose connection instead, for schema validation and a friendlier query API. Two connections, two purposes, not an accident.

Schema changes made to a Mongoose model (adding `timestamps`, turning off `versionKey`, etc.) are **not retroactive** — they only shape new writes. A schema change that should apply to documents that already exist needs an explicit one-off migration script run against the real collections, not just a model edit.

### Auth

NextAuth v5 (beta), configured in `lib/server/auth.ts`: Google OAuth plus a custom Credentials provider backed by `bcryptjs` password hashes in a Mongoose `LocalCredentialModel`. Session strategy is forced to JWT (the Credentials provider requires it). A parallel, NextAuth-independent OTP flow (`app/api/auth/signup/*`, `app/api/auth/forgot-password/*`) handles account creation and password resets via emailed one-time codes (Brevo), rate-limited per `lib/server/auth-rate-limit.ts`.

Password strength is enforced only in production (`lib/password-policy.ts`, gated on `process.env.NODE_ENV === "production"`): local/dev signups can use any password, since Next.js specially inlines that exact env check into client bundles, so the same gate works correctly in both the API routes and the client-side signup form with no extra plumbing.

## Directory map

```text
app/
  page.tsx            The entire app shell — the View union + every top-level section
  layout.tsx           Root HTML shell, providers (theme, session, PDF font registration)
  privacy/page.tsx      Real standalone route — deliberately outside the View shell
  not-found.tsx, error.tsx, global-error.tsx    404 / route-level / root error boundaries
  icon.tsx, apple-icon.tsx, opengraph-image.tsx   Favicon/share-card images (next/og)
  robots.ts, sitemap.ts, manifest.ts              SEO/PWA metadata routes
  api/                 Route handlers: auth, plans CRUD/import, activity log, AI chat, account mgmt
components/
  tools/                The 19 standalone tool components — 17 calculators (SIP, Lumpsum, SWP,
                         Inflation, EPF, PPF, FD, RD, EMI, GST, XIRR, NPS, Term Insurance, STP,
                         SSY, SCSS, Retirement) plus Net Worth and Portfolio Analyzer — none
                         require a saved Plan
  plan/                 Everything for building/viewing a saved Plan: event editor, timeline,
                         goal dialogs, historical/scenario tabs, fund allocation, ledger table
  plans/                "My Plans" library: list, cards, detail view, create wizard
  dashboard/            Dashboard Overview, market snapshot, recent activity
  report/               PDF/plain-language export page
  settings/, help/, onboarding/, auth/, ai/     One section each, self-explanatory
  ui/                    shadcn/Radix primitives — treat as a library, not app code
lib/
  engine/               The simulation core — see above
  calculators/           Pure financial math: every standalone closed-form calculator (EPF, EPS,
                         PPF, FD, RD, EMI, GST, NPS, Term Insurance, STP, SSY, SCSS, Retirement,
                         tax/city-cost/asset-allocation helpers) plus goal-calc.ts
  stores/                 Client-side stores (plans, goals, profile, net worth, onboarding,
                         activity log, small UI preferences), useSyncExternalStore-based
  goals/                  Plan/Goal domain composition: default-plan, plan-doc, goal-presets,
                         compute-plan-results, build-chart-data, build-scratch-plan
  server/                 Auth/DB/email/rate-limit infra: auth.ts, mongodb.ts, mongoose.ts,
                         auth-lookup.ts, auth-rate-limit.ts, ai-rate-limit.ts, email.ts
  models/                  Mongoose schemas
  data/mfapi.ts             mfapi.in (real NAV data) client
  report/report-document.tsx  @react-pdf/renderer PDF template
  format.ts, id.ts, utils.ts, download.ts, profanity-filter.ts,
  app-view.ts, site-config.ts, password-policy.ts    Cross-cutting generics (see below)
types/
  next-auth.d.ts          Module augmentation adding id/hasPassword to session.user
```

## Feature catalog

| Section | What it does | Powered by |
| --- | --- | --- |
| **Dashboard** | Cross-plan overview, market snapshot, recent activity, onboarding nudges. With 2+ saved plans, the spotlight card defaults to the most recently updated one but can be pinned to any plan | Aggregates saved plans |
| **My Plans** | List, open, duplicate, delete every saved Plan | `lib/stores/use-plans-store.ts` |
| **Export Report** | Plain-language PDF snapshot of your numbers, downloadable or emailable | `lib/report/report-document.tsx` |
| **Financial Profile** | Income/expenses/existing-assets wizard feeding recommendations | Standalone wizard state |
| **Net Worth** | Tracks assets by category (cash, investments, property, gold, vehicle, other) against liabilities pulled from Financial Profile's debts, to a running net-worth figure | `lib/stores/use-networth-store.ts` (localStorage only, never synced) |
| **Goal Planner** | Reverse-solves the monthly SIP a target requires (inflation-aware) | `lib/calculators/goal-calc.ts` (closed-form, not a replay) |
| **Scenario Lab** | Compares whole saved plans against each other | `computePlanResults` per plan |
| **Historical Analysis** | Replays a scratch plan against real traded NAV | `lib/engine` historical path |
| **Portfolio Analyzer** | Per-fund breakdown of a saved multi-fund plan | `lib/engine/portfolio-replay.ts` |
| **SIP / Lumpsum / SWP Calculators** | Standalone projections, no saved plan needed | Scratch `Plan` → full `lib/engine` |
| **XIRR Calculator** | Annualized return of any dated cashflow series | `lib/engine/xirr.ts` directly |
| **Inflation Calculator** | Future cost of today's ₹, or today's value of a future ₹ | `lib/engine/inflation.ts` |
| **EPF Calculator** | EPF corpus + EPS pension, with optional salary-hike curve modeling | `lib/calculators/epf-calc.ts` + `eps-calc.ts` (standalone) |
| **PPF / FD / RD Calculators** | Maturity value at real bank/PPF compounding conventions | `lib/calculators/ppf-calc.ts` / `fd-calc.ts` / `rd-calc.ts` (standalone) |
| **EMI Calculator** | Reducing-balance loan amortization | `lib/calculators/emi-calc.ts` (standalone) |
| **GST Calculator** | Add/remove GST at any slab | `lib/calculators/gst-calc.ts` (standalone) |
| **NPS Calculator** | Tier-I retirement corpus at a chosen blended return, plus PFRDA's min-40%-annuity / up-to-60%-lump-sum exit split | `lib/calculators/nps-calc.ts` (standalone) |
| **Term Insurance Calculator** | Age-banded income-multiple cover target, adjusted for existing debt and savings | `lib/calculators/term-insurance-calc.ts` (standalone) |
| **STP Calculator** | Month-by-month source→destination fund transfer simulation — flags if the source fund runs dry before the transfer window ends | `lib/calculators/stp-calc.ts` (simulated, not closed-form) |
| **SSY Calculator** | Sukanya Samriddhi Yojana maturity — 15-year deposit window, 21-year maturity, annual compounding | `lib/calculators/ssy-calc.ts` (standalone) |
| **SCSS Calculator** | Senior Citizen Savings Scheme — quarterly payout on a fixed, non-compounding deposit | `lib/calculators/scss-calc.ts` (standalone) |
| **Retirement Calculator** | Solves the inflation-growing starting monthly withdrawal a corpus can sustain for a chosen retirement length | `lib/calculators/retirement-income.ts` (standalone) |

"Standalone" means the tool has its own closed-form formula and deliberately sits outside `lib/engine` — a government-declared FD/PPF rate or a fixed loan rate has no scenario band, so there's nothing for the shared engine's conservative/expected/optimistic machinery to add.

## Worked examples

Every number below was run through the actual code in this repo (via `npx tsx -e`), not hand-estimated — this is what "auditable" means in practice.

**1. SIP Calculator — the basics.** ₹6,000/month, 12% expected annual return, 25 years, starting on the 31st of a month:
→ **₹1,02,13,239** at maturity (matches independent SIP calculators' output exactly, once the shared engine's date-arithmetic edge case above was fixed — the single-engine architecture is why that fix applied to every tool at once).

**2. EPF Calculator, Advanced mode — modeling a real career.** ₹30,000 basic, 12%/3.67% contribution split, 8.25% EPF rate, current age 30 → retirement 58 (28 years), with an 8%/year "Steady" salary hike:
→ Combined monthly contribution grows **₹4,701 → ₹37,552** over the plan, maturity **₹1,41,78,968**.
Switch the same inputs to the **"Peak, then decline"** career curve (growth to a peak at year 15, then tapering off — modeling a commission-heavy or physically demanding role winding down) instead of Steady:
→ Maturity drops to **₹1,13,14,837** — same salary today, same contribution rates, a materially different outcome purely from *how* the salary path is shaped over time, which is exactly the nuance a flat "X% annual increment" field can't capture.

**3. Goal Planner — reverse-solving a target.** You want ₹50,00,000 (today's money) in 15 years, expecting 12% annual returns, no existing savings:
→ Without inflation: **₹10,506/month**.
→ With 6% inflation folded in (the target itself grows to ₹1,19,82,791 by year 15, since ₹50L today buys less in 15 years): **₹25,178/month** — nearly 2.4× more, which is the whole reason the Goal Planner treats inflation as a first-class input rather than an afterthought.

**4. XIRR Calculator — irregular cashflows.** You invested ₹1,00,000 on 2020-01-01 and it was worth ₹1,30,000 on 2023-01-01 (a single lumpsum, three years, no SIP regularity to lean on):
→ **9.13%** annualized return — the same Newton-Raphson solver (`lib/engine/xirr.ts`) that powers every other tool's return figures, exposed directly.

**5. EMI Calculator.** A ₹50,00,000 home loan at 9% for 20 years:
→ EMI **₹44,986/month**, total interest paid over the loan's life **₹57,96,711** — more than the principal itself, which the year-by-year amortization schedule makes visible rather than burying in a single headline EMI figure.

**6. Historical Analysis — what actually happened, not what was assumed.** Instead of assuming a 12% CAGR for the last 10 years, point a scratch plan at a real mutual fund scheme (via mfapi.in) and replay the same ₹6,000/month SIP against its *actual* traded NAV history — weekends, holidays, and real volatility included. The result is frequently different from (and more instructive than) any flat-rate assumption, which is the entire point of the feature.

**7. Portfolio Analyzer — a real multi-fund SIP.** Split a ₹20,000/month SIP as 50% large-cap / 30% mid-cap / 20% debt: the engine runs each slice as its own independent replay at its own weight (`lib/engine/portfolio-replay.ts`), then merges them — so the per-fund breakdown is a real decomposition of the portfolio's actual mechanics, not an approximation layered on top of a single blended return.

## Extending the app — for developers

**Adding a new top-level section** (a new "page"): add a variant to `View` in `lib/app-view.ts`, add its title/subtitle to `app/page.tsx`'s `TITLES`/`SUBTITLES` maps, add the conditional render there, and add a nav entry in `components/app-sidebar.tsx`'s `SECTIONS`. There is no `app/<name>/page.tsx` to create — see [Architecture](#architecture).

**Adding a new standalone calculator** (like EPF/PPF/FD — a closed-form formula with no scenario band): write `lib/calculators/<name>-calc.ts` as a pure function (`compute<Name>(...) : <Name>Result`), no React, no engine dependency. Build the UI in `components/tools/<name>-calculator.tsx` following the existing calculators' pattern (`SliderField` inputs on the left, result cards + `BreakdownDonut` on the right; a date input, if any, uses antd's `DatePicker` + `dayjs` — see the house-style note below). Verify the formula with a throwaway `npx tsx -e "import { computeX } from './lib/calculators/x-calc'; console.log(computeX(...))"` before wiring up the UI — this repo's whole engine-fix history exists because a formula was trusted without that check.

**Adding a new engine-backed calculator** (anything that should get the conservative/expected/optimistic band, or eventually plug into Historical/Scenario Lab): build a scratch `Plan` via `lib/goals/build-scratch-plan.ts`, feeding it the `PlanEvent[]` your tool needs (see `lib/engine/types.ts` for the exact event shapes — a `SIP_START` plus a yearly `SIP_STEPUP` is the pattern for anything that "grows every year"), then call `computePlanResults(plan)` (from `lib/goals/compute-plan-results.ts`) and render off the returned `SimulationResult`s exactly like the SIP/Lumpsum/SWP calculators do.

**A minimal worked event stream**, for reference — a ₹5,000 SIP starting Jan 2025, stepped up 10% every year:

```ts
const events: PlanEvent[] = [
  { id: "1", type: "SIP_START", date: "2025-01-01", amount: 5000 },
  { id: "2", type: "SIP_STEPUP", date: "2026-01-01", mode: "percent", value: 10 },
  { id: "3", type: "SIP_STEPUP", date: "2027-01-01", mode: "percent", value: 10 },
];
```

`replayMonths` walks this month by month: ₹5,000/month through all of 2025, ₹5,500/month through 2026, ₹6,050/month from 2027 on — the engine derives the schedule from the events, nothing pre-bakes it.

**Verification discipline used throughout this codebase**: `npx tsc --noEmit -p .` and `npx eslint . --max-warnings=0` should be clean before any change is considered done; non-trivial math should be spot-checked against the real code via `npx tsx -e "..."` (as a single-line script — multi-line `-e` strings have silently produced no output in this environment) rather than hand-verified; UI changes should be checked live (this repo has been developed with the Playwright MCP tools for exactly that) rather than assumed from reading the JSX.

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # Turbopack dev server
```

| Env var | Purpose |
| --- | --- |
| `AUTH_SECRET` | NextAuth session encryption |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth sign-in |
| `MONGODB_URI` | Both the native-driver auth adapter and Mongoose app data |
| `NEXT_PUBLIC_SITE_URL` | Real deployed URL (no trailing slash) — used by the sitemap, robots.txt, and OG/Twitter share-card links. Falls back to `localhost` if unset, so it only needs setting once a production domain exists |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_MODEL` | AI assistant (`/api/chat`) |
| `AI_DAILY_LIMIT_PER_USER` / `AI_DAILY_LIMIT_GLOBAL` | AI assistant rate limits |
| `BREVO_API_KEY` / `BREVO_FROM_EMAIL` | OTP emails (signup/reset) and report emails |

`npm run build` / `npm run lint` are the standard Next.js production build and ESLint check.

> This project's Next.js version has documented breaking changes from what most training data assumes — see `node_modules/next/dist/docs/` (resolved relative to the project root) before writing App Router code that leans on version-specific APIs.

## House style / conventions

These aren't enforced by tooling — they're patterns this codebase has converged on, worth following for consistency:

- **Comments explain *why*, never *what*.** A well-named function doesn't need a comment restating its name; a non-obvious constraint, a past bug, or a deliberate trade-off does.
- **No new abstractions until a third use case needs one.** Three similar lines beat a premature shared helper.
- **Derive state during render instead of syncing it with `useEffect`.** This project's ESLint config rejects `setState` inside a `useEffect` body (`react-hooks/set-state-in-effect`). The fix is almost always a plain derived value computed inline (e.g. `const effectiveX = Math.min(x, y)`), not an effect that writes back to state.
- **Verify math against the real code, not by re-deriving it by hand.** Every non-trivial formula change in this project's history was checked with a real `npx tsx -e` call against the actual `lib/` function before being trusted.
- **Closed-form vs. engine-backed is a deliberate choice per tool**, not an inconsistency — see [Feature catalog](#feature-catalog). A fixed-rate instrument (FD, PPF, EMI) has no scenario band to speak of; anything with a "what if returns are different" question genuinely worth asking goes through `lib/engine`.
- **Every date input uses antd's `DatePicker` + `dayjs`, never a native `<input type="date">`.** App data stays a plain ISO string (`"YYYY-MM-DD"`) everywhere outside the picker itself — convert in with `dayjs(iso, "YYYY-MM-DD")` for the `value` prop, and back out with `.format("YYYY-MM-DD")` in `onChange`. Use `format="DD MMM YYYY"` for display and `disabledDate={(current: Dayjs) => boolean}` for any min/max bound — see `components/plan/event-dialog.tsx` or `components/plan/fund-switch-dialog.tsx` for the pattern with both bounds wired up.
- **A Mongoose schema change doesn't retroactively touch existing documents.** Adding `timestamps` or flipping `versionKey` only shapes new writes; making it apply to what's already in MongoDB needs an explicit migration run against the real collections.
