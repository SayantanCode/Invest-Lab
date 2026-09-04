// Sign-in/sign-up, inline, for the floating bubble only (the full-page
// assistant just points at Settings). Google is an unavoidable full-page
// redirect to accounts.google.com and back — the `ai-bubble-reopen` flag
// makes that round-trip land back with the bubble already open. Email +
// password stays entirely in-place: signInWithCredentials resolves with no
// navigation at all, so the moment it succeeds the parent's useSession()
// flips and the panel swaps straight to the live chat.

"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { KeyRound, Loader2, LockKeyhole } from "lucide-react";

import { getPasswordIssues, passwordHint } from "@/lib/password-policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REOPEN_KEY = "investlab.ai-bubble-reopen";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.92l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.11C6.22 6.87 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** Live rule feedback under any "set a new password" field — quiet in dev (the rule is off), a small checklist in production. */
function PasswordRequirements({ password }: { password: string }) {
  const issues = getPasswordIssues(password);
  if (password.length === 0) {
    return <p className="text-xs text-muted-foreground">{passwordHint()}</p>;
  }
  if (issues.length === 0) {
    return <p className="text-xs text-positive">Looks good.</p>;
  }
  return <p className="text-xs text-muted-foreground">{issues[0]}</p>;
}

function AlertBox({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs leading-relaxed",
        tone === "error" ? "border-negative/30 bg-negative/5 text-negative" : "border-primary/30 bg-primary/5 text-primary"
      )}
    >
      {children}
    </p>
  );
}

export function InlineAuth({ intro }: { intro?: string } = {}) {
  const [mode, setMode] = React.useState<"signin" | "signup" | "forgot">("signin");
  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const signupPasswordIssues = getPasswordIssues(password);
  const signupPasswordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const signupCanSubmit = signupPasswordIssues.length === 0 && confirmPassword.length > 0 && !signupPasswordsMismatch;

  const resetPasswordIssues = getPasswordIssues(password);
  const resetPasswordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const resetCanSubmit = resetPasswordIssues.length === 0 && confirmPassword.length > 0 && !resetPasswordsMismatch;

  function goToForgotPassword() {
    setMode("forgot");
    setStep("form");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setInfo(null);
  }

  function backToSignIn() {
    setMode("signin");
    setStep("form");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setInfo(null);
  }

  function handleGoogle() {
    try {
      window.localStorage.setItem(REOPEN_KEY, "true");
    } catch {
      // Non-fatal — the bubble just won't auto-reopen after the redirect.
    }
    void signIn("google", { callbackUrl: window.location.href });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (!result || result.error) {
      if (result?.code === "google_only") {
        setError('This email is registered with Google — use "Continue with Google" instead.');
      } else {
        setError("That email and password don't match — check them and try again.");
      }
    }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!signupCanSubmit) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Couldn't send a code — try again.");
        return;
      }
      setStep("otp");
      setInfo(`We sent a 6-digit code to ${email}.`);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "That code didn't work — try again.");
        return;
      }
      // Account now exists — sign in the normal way so Auth.js (not us)
      // sets the session cookie. No navigation, so the panel swaps straight
      // to the chat once this resolves.
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError("Account created, but sign-in failed — try signing in below.");
        setMode("signin");
        setStep("form");
      }
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Couldn't send a code — try again.");
        return;
      }
      setStep("otp");
      setPassword("");
      setConfirmPassword("");
      setInfo(`We sent a 6-digit code to ${email}.`);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!resetCanSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, newPassword: password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "That code didn't work — try again.");
        return;
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError("Password reset, but sign-in failed — try signing in below.");
        backToSignIn();
      }
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 py-1 px-5 sm:py-2 ">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <LockKeyhole className="size-4.5 text-primary" />
        </span>
        <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
          {intro ?? "Sign in to use the AI assistant — daily usage is shared fairly across everyone on the free tier."}
        </p>
      </div>

      <Button type="button" variant="outline" onClick={handleGoogle} className="gap-2">
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      {mode === "signup" && step === "otp" ? (
        <form onSubmit={handleVerifyOtp} className="grid gap-3">
          {info && <AlertBox tone="info">{info}</AlertBox>}
          <div className="grid gap-1.5">
            <Label htmlFor="bubble-otp">6-digit code</Label>
            <Input
              id="bubble-otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              required
            />
          </div>
          {error && <AlertBox tone="error">{error}</AlertBox>}
          <Button type="submit" disabled={loading || otp.length !== 6} className="gap-1.5">
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            Verify & continue
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("form");
              setError(null);
              setInfo(null);
            }}
            className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Use a different email
          </button>
        </form>
      ) : mode === "forgot" ? (
        step === "otp" ? (
          <form onSubmit={handleForgotVerifyOtp} className="grid gap-3">
            {info && <AlertBox tone="info">{info}</AlertBox>}
            <div className="grid gap-1.5">
              <Label htmlFor="forgot-otp">6-digit code</Label>
              <Input
                id="forgot-otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="forgot-new-password">New password</Label>
              <Input
                id="forgot-new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <PasswordRequirements password={password} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="forgot-confirm-password">Confirm new password</Label>
              <Input
                id="forgot-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {resetPasswordsMismatch && <p className="text-xs text-negative">Passwords don&apos;t match.</p>}
            </div>
            {error && <AlertBox tone="error">{error}</AlertBox>}
            <Button type="submit" disabled={loading || otp.length !== 6 || !resetCanSubmit} className="gap-1.5">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Reset password
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setError(null);
                setInfo(null);
              }}
              className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotRequestOtp} className="grid gap-3">
            <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset code.</p>
            <div className="grid gap-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            {error && <AlertBox tone="error">{error}</AlertBox>}
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Send reset code
            </Button>
            <button
              type="button"
              onClick={backToSignIn}
              className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Back to sign in
            </button>
          </form>
        )
      ) : (
        <>
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as "signin" | "signup");
              setError(null);
              setPassword("");
              setConfirmPassword("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={mode === "signin" ? handleSignIn : handleRequestOtp} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="bubble-email">Email</Label>
              <Input
                id="bubble-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="bubble-password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={goToForgotPassword}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="bubble-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
              />
              {mode === "signup" && <PasswordRequirements password={password} />}
            </div>
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="bubble-confirm-password">Confirm password</Label>
                <Input
                  id="bubble-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {signupPasswordsMismatch && <p className="text-xs text-negative">Passwords don&apos;t match.</p>}
              </div>
            )}
            {error && <AlertBox tone="error">{error}</AlertBox>}
            <Button type="submit" disabled={loading || (mode === "signup" && !signupCanSubmit)} className="gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
              {mode === "signin" ? "Sign in" : "Send verification code"}
            </Button>
            {mode === "signup" && (
              <p className="text-center text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
