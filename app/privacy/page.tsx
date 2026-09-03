import Link from "next/link";
import type { Metadata } from "next";
import { Calculator } from "lucide-react";

import { SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and shares data — and what stays entirely in your browser.`,
};

const LAST_UPDATED = "3 September 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="grid gap-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Calculator className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">{SITE_NAME}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {SITE_NAME} is a free investment-planning tool. This page explains, in plain terms, exactly what data
          exists, where it lives, and who ever sees it. The short version: if you use {SITE_NAME} without signing
          in, none of your financial data ever leaves your browser. Signing in adds account sync and an optional AI
          assistant, both described below.
        </p>

        <Section title="Data that never leaves your browser">
          <p>
            Your financial profile, goals, saved plans, net worth entries, activity log, and AI chat history are all
            stored in your browser&apos;s <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">localStorage</code> by
            default — not sent to any server. This is true whether or not you ever sign in; it&apos;s only used to
            sync data across your own devices (see below). If you never sign in, this data exists only on the
            device and browser you entered it on, and clearing your browser data deletes it permanently — there is
            no backup copy anywhere.
          </p>
        </Section>

        <Section title="Data we collect if you sign in">
          <p>
            Creating an account (via Google, or email + password) lets your saved Plans sync across devices. We
            store:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your name, email address, and profile photo (if you sign in with Google).</li>
            <li>A securely hashed password (never the password itself) if you sign up with email + password.</li>
            <li>The Plans you explicitly save while signed in.</li>
          </ul>
          <p>
            Your financial profile, goals, and net worth entries stay in your browser even when signed in — they
            are never uploaded to our database.
          </p>
        </Section>

        <Section title="Third parties we share data with">
          <p>We don&apos;t sell or rent your data, and we don&apos;t run ads or ad-tracking of any kind. A few third-party services are used to make specific features work, only when you use them:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Google (Sign in with Google).</strong> If you choose this option,
              Google shares your name, email, and profile photo with us, per Google&apos;s own OAuth flow.
            </li>
            <li>
              <strong className="text-foreground">Google Gemini (AI Assistant).</strong> If you use the AI chat,
              your typed messages — plus a snapshot of your goals, profile, and saved-plan summary, so the assistant
              can answer questions about your own numbers — are sent to Google&apos;s Gemini API to generate a
              reply. This only happens when you actively send a message to the assistant.
            </li>
            <li>
              <strong className="text-foreground">Brevo (email delivery).</strong> Signing up with email/password,
              resetting a password, or emailing yourself a copy of your report sends your email address (and, for
              the report, the report itself) to Brevo, a transactional email provider, solely to deliver that one
              email.
            </li>
            <li>
              <strong className="text-foreground">mfapi.in (fund data).</strong> Searching for mutual funds or
              running a historical/portfolio analysis fetches real fund NAV data directly from your browser to
              mfapi.in, a public, community-run API. No account or personal data is sent — only fund names, scheme
              codes, or dates.
            </li>
            <li>
              <strong className="text-foreground">TradingView (market snapshot).</strong> The SENSEX/USD-INR ticker
              on the dashboard is an embedded TradingView widget, loaded directly from tradingview.com. It may set
              its own cookies under TradingView&apos;s own privacy practices, which we don&apos;t control.
            </li>
          </ul>
        </Section>

        <Section title="Cookies">
          <p>
            We set exactly one cookie: a secure, httpOnly session cookie used to keep you signed in. It carries no
            tracking or advertising purpose and isn&apos;t readable by any script. We don&apos;t use analytics
            cookies, ad cookies, or any tracking scripts (no Google Analytics, no ad pixels, nothing similar) — none
            are present anywhere in this app.
          </p>
        </Section>

        <Section title="How long we keep data">
          <p>
            Account data and synced Plans are kept until you delete your account. Verification codes (for sign-up
            or password reset) automatically expire within minutes and are deleted whether or not they&apos;re
            used. Local browser data persists until you clear it yourself, in Settings or via your browser.
          </p>
        </Section>

        <Section title="Your controls">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Use it without an account.</strong> Every calculator and planning
              tool works fully signed out — nothing is ever sent anywhere.
            </li>
            <li>
              <strong className="text-foreground">Export your data anytime.</strong> Settings → Export downloads a
              full copy of your data as a JSON file.
            </li>
            <li>
              <strong className="text-foreground">Clear local data anytime.</strong> Settings → Clear local data
              removes everything stored in your browser.
            </li>
            <li>
              <strong className="text-foreground">Delete your account anytime.</strong> Settings → Delete account
              permanently removes your account and synced Plans from our database.
            </li>
          </ul>
        </Section>

        <Section title="Children's privacy">
          <p>
            {SITE_NAME} is intended for adults managing their own finances and isn&apos;t directed at children. We
            don&apos;t knowingly collect data from anyone under 18.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes in a meaningful way, this page will be updated and the &quot;Last updated&quot;
            date above will change accordingly. Continued use of {SITE_NAME} after an update means you accept the
            revised policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or your data can be sent to{" "}
            <a href="mailto:sayantan648@gmail.com" className="text-primary underline underline-offset-2">
              sayantan648@gmail.com
            </a>
            . For accessing, exporting, or deleting your own data, the fastest path is Settings inside the app —
            those actions are self-service and immediate.
          </p>
        </Section>
      </main>
    </div>
  );
}
