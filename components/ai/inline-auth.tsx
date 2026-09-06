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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
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
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.11C6.22 6.87 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** Live rule feedback under any "set a new password" field. */
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

function AlertBox({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs leading-relaxed",
        tone === "error"
          ? "border-negative/30 bg-negative/5 text-negative"
          : "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      {children}
    </p>
  );
}

/**
 * Reusable 6-digit OTP input.
 *
 * InputOTP provides:
 * - Individual digit boxes
 * - Automatic focus movement
 * - Backspace navigation
 * - Full OTP paste support
 * - Numeric input
 */
function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={(value) => onChange(value.replace(/\D/g, ""))}
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={disabled}
      containerClassName="w-full"
      aria-label="6-digit verification code"
    >
      <InputOTPGroup className="w-full justify-between gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className={cn(
              "size-11 rounded-lg border bg-background text-base font-semibold shadow-sm transition-all",
              "first:rounded-lg first:border-l",
              "last:rounded-lg",
              "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
              hasError &&
                "border-negative/50 focus-within:border-negative focus-within:ring-negative/20",
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

export function InlineAuth({ intro }: { intro?: string } = {}) {
  const [mode, setMode] = React.useState<"signin" | "signup" | "forgot" | "verify">(
    "signin",
  );

  const [step, setStep] = React.useState<"form" | "otp">("form");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [resendCount, setResendCount] = React.useState(0);
  const maxResends = 3;

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const signupPasswordIssues = getPasswordIssues(password);

  const signupPasswordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const signupCanSubmit =
    signupPasswordIssues.length === 0 &&
    confirmPassword.length > 0 &&
    !signupPasswordsMismatch;

  const resetPasswordIssues = getPasswordIssues(password);

  const resetPasswordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const resetCanSubmit =
    resetPasswordIssues.length === 0 &&
    confirmPassword.length > 0 &&
    !resetPasswordsMismatch;

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

    void signIn("google", {
      callbackUrl: window.location.href,
    });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      if (result?.code === "google_only") {
        setLoading(false);
        setError(
          'This email is registered with Google — use "Continue with Google" instead.',
        );
      } else if (result?.code === "unverified_account") {
        // Account exists but not verified — redirect to verification flow
        setMode("verify");
        setStep("otp");
        setInfo(`Your account is not verified yet. We'll send a verification code to ${email}.`);
        setError(null);
        setResendCountdown(0);
        setResendCount(0);
        setOtp("");
        
        // Trigger OTP send for initial entry to verify mode
        try {
          const res = await fetch("/api/auth/verify-unverified-account/request-otp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
            }),
          });

          const body = await res.json();

          if (!res.ok) {
            setError(body.error ?? "Couldn't send a code — try again.");
            setLoading(false);
            return;
          }

          setResendCountdown(60);
          setResendCount(1);
          setInfo(`Verification code sent to ${email}. You have ${maxResends - 1} resends remaining.`);
        } catch {
          setError(
            "Couldn't reach the server — check your connection and try again.",
          );
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError(
          "That email and password don't match — check them and try again.",
        );
      }
    } else {
      setLoading(false);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Couldn't send a code — try again.");
        return;
      }

      setOtp("");
      setStep("otp");
      setResendCountdown(60);
      setResendCount(1); // First request counts as 1
      setInfo(`We sent a 6-digit code to ${email}. You have ${maxResends - 1} resends remaining.`);
    } catch {
      setError(
        "Couldn't reach the server — check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();

    if (otp.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      // NEW ACCOUNT FLOW: Create account in pending state, then verify email
      
      // Step 1: Verify OTP and create account in pending state
      const verifyRes = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
        }),
      });

      const verifyBody = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyBody.error ?? "That code didn't work — try again.");
        return;
      }

      // Step 2: Verify email to complete account setup
      const emailRes = await fetch("/api/auth/signup/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
        }),
      });

      const emailBody = await emailRes.json();

      if (!emailRes.ok) {
        setError(emailBody.error ?? "Email verification failed — try again.");
        return;
      }

      // Step 3: Auto-login after verification
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Account created and verified, but sign-in failed — try signing in below.");
        setMode("signin");
        setStep("form");
      }
    } catch {
      setError(
        "Couldn't reach the server — check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyExistingAccount(e: React.FormEvent) {
    e.preventDefault();

    if (otp.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      // EXISTING ACCOUNT FLOW: Account already exists, just verify email
      
      const res = await fetch("/api/auth/verify-unverified-account/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "That code didn't work — try again.");
        return;
      }

      // Email now verified — auto-login with the credentials
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Email verified, but sign-in failed — try signing in below.");
        setMode("signin");
        setStep("form");
      }
    } catch {
      setError(
        "Couldn't reach the server — check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestVerificationOtp(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }

    if (resendCount >= maxResends) {
      setError(`Maximum resend attempts (${maxResends}) reached. Try signing up again.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-unverified-account/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Couldn't send a code — try again.");
        return;
      }

      const newResendCount = resendCount + 1;
      setResendCountdown(60);
      setResendCount(newResendCount);
      setOtp("");
      setInfo(`Verification code sent to ${email}. ${maxResends - newResendCount} resend(s) remaining.`);
    } catch {
      setError(
        "Couldn't reach the server — check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupResend(e: React.FormEvent) {
    e.preventDefault();

    if (resendCount >= maxResends) {
      setError(`Maximum resend attempts (${maxResends}) reached. Try again in 24 hours.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Couldn't resend code — try again.");
        return;
      }

      const newResendCount = resendCount + 1;
      setResendCountdown(60);
      setResendCount(newResendCount);
      setOtp("");
      setInfo(`Code resent to ${email}. ${maxResends - newResendCount} resend(s) remaining.`);
    } catch {
      setError("Couldn't reach the server — try again.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Couldn't send a code — try again.");
        return;
      }

      setOtp("");
      setStep("otp");
      setPassword("");
      setConfirmPassword("");
      setInfo(`We sent a 6-digit code to ${email}.`);
    } catch {
      setError(
        "Couldn't reach the server — check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotVerifyOtp(e: React.FormEvent) {
    e.preventDefault();

    if (!resetCanSubmit || otp.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
          newPassword: password,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "That code didn't work — try again.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Password reset, but sign-in failed — try signing in below.");

        backToSignIn();
      }
    } catch {
      setError(
        "Couldn't reach the server — check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 px-5 py-1 sm:py-2">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <LockKeyhole className="size-4.5 text-primary" />
        </span>

        <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
          {intro ??
            "Sign in to use the AI assistant — daily usage is shared fairly across everyone on the free tier."}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        className="gap-2"
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ───────────────── SIGNUP OTP ───────────────── */}

      {mode === "signup" && step === "otp" ? (
        <form onSubmit={handleVerifyOtp} className="grid gap-3">
          {info && <AlertBox tone="info">{info}</AlertBox>}

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bubble-otp">Verification code</Label>

              <span className="text-xs text-muted-foreground">6 digits</span>
            </div>

            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={loading}
              hasError={!!error}
            />

            <p className="text-xs text-muted-foreground">
              Enter the code sent to your email. You can also paste the complete
              code.
            </p>
          </div>

          {error && <AlertBox tone="error">{error}</AlertBox>}

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="gap-1.5"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            Verify & sign up
          </Button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSignupResend}
              disabled={resendCountdown > 0 || resendCount >= maxResends || loading}
              className={cn(
                "w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                resendCountdown > 0 || resendCount >= maxResends
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              )}
            >
              {resendCountdown > 0
                ? `⏱️ Resend code (${resendCountdown}s)`
                : resendCount >= maxResends
                  ? "❌ Max resends (3) reached"
                  : `🔄 Resend code (${maxResends - resendCount} left)`}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("form");
                setOtp("");
                setError(null);
                setInfo(null);
                setResendCountdown(0);
                setResendCount(0);
              }}
              className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      ) : mode === "verify" && step === "otp" ? (
        /* ───────────────── EMAIL VERIFICATION FOR EXISTING UNVERIFIED ACCOUNT ───────────────── */
        <form onSubmit={handleVerifyExistingAccount} className="grid gap-3">
          <AlertBox tone="info">
            Your account needs email verification to complete signup. Check your email for a 6-digit code.
          </AlertBox>

          {info && <AlertBox tone="info">{info}</AlertBox>}

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="verify-otp">Verification code</Label>

              <span className="text-xs text-muted-foreground">6 digits</span>
            </div>

            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={loading}
              hasError={!!error}
            />

            <p className="text-xs text-muted-foreground">
              Enter the code sent to your email to complete verification.
            </p>
          </div>

          {error && <AlertBox tone="error">{error}</AlertBox>}

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="gap-1.5"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            Verify email & sign in
          </Button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleRequestVerificationOtp}
              disabled={resendCountdown > 0 || resendCount >= maxResends || loading}
              className={cn(
                "w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                resendCountdown > 0 || resendCount >= maxResends
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              )}
            >
              {resendCountdown > 0
                ? `⏱️ Resend code (${resendCountdown}s)`
                : resendCount >= maxResends
                  ? "❌ Max resends (3) reached"
                  : `🔄 Resend code (${maxResends - resendCount} left)`}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setStep("form");
                setOtp("");
                setError(null);
                setInfo(null);
                setResendCountdown(0);
                setResendCount(0);
              }}
              className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </form>
      ) : mode === "forgot" ? (
        /* ───────────────── FORGOT PASSWORD ───────────────── */
        step === "otp" ? (
          <form onSubmit={handleForgotVerifyOtp} className="grid gap-3">
            {info && <AlertBox tone="info">{info}</AlertBox>}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="forgot-otp">Verification code</Label>

                <span className="text-xs text-muted-foreground">6 digits</span>
              </div>

              <OtpInput
                value={otp}
                onChange={setOtp}
                disabled={loading}
                hasError={!!error}
              />

              <p className="text-xs text-muted-foreground">
                Enter the code sent to your email. You can also paste the
                complete code.
              </p>
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
              <Label htmlFor="forgot-confirm-password">
                Confirm new password
              </Label>

              <Input
                id="forgot-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              {resetPasswordsMismatch && (
                <p className="text-xs text-negative">
                  Passwords don&apos;t match.
                </p>
              )}
            </div>

            {error && <AlertBox tone="error">{error}</AlertBox>}

            <Button
              type="submit"
              disabled={loading || otp.length !== 6 || !resetCanSubmit}
              className="gap-1.5"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Reset password
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("form");
                setOtp("");
                setError(null);
                setInfo(null);
              }}
              className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Use a different email
            </button>
          </form>
        ) : (
          /* ───────────────── FORGOT PASSWORD EMAIL ───────────────── */
          <form onSubmit={handleForgotRequestOtp} className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset code.
            </p>

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
        /* ───────────────── SIGN IN / SIGN UP ───────────────── */
        <>
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as "signin" | "signup");
              setStep("form");
              setOtp("");
              setError(null);
              setInfo(null);
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

          <form
            onSubmit={mode === "signin" ? handleSignIn : handleRequestOtp}
            className="grid gap-3"
          >
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
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
              />

              {mode === "signup" && (
                <PasswordRequirements password={password} />
              )}
            </div>

            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="bubble-confirm-password">
                  Confirm password
                </Label>

                <Input
                  id="bubble-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                {signupPasswordsMismatch && (
                  <p className="text-xs text-negative">
                    Passwords don&apos;t match.
                  </p>
                )}
              </div>
            )}

            {error && <AlertBox tone="error">{error}</AlertBox>}

            <Button
              type="submit"
              disabled={loading || (mode === "signup" && !signupCanSubmit)}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <KeyRound className="size-3.5" />
              )}

              {mode === "signin" ? "Sign in" : "Send verification code"}
            </Button>

            {mode === "signup" && (
              <p className="text-center text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link
                  href="/privacy-policy"
                  target="_blank"
                  className="underline underline-offset-2 hover:text-foreground"
                >
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
