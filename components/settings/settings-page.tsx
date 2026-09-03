"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Download,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  MonitorSmartphone,
  Rocket,
  Sparkles,
  Sun,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import type { View } from "@/app/page";
import { useNudgesEnabled } from "@/lib/stores/use-nudge-preference-store";
import { getPasswordIssues, passwordHint } from "@/lib/password-policy";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InlineAuth } from "@/components/ai/inline-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: MonitorSmartphone },
] as const;

/** This app's own real user-data keys — deliberately excludes UI preferences (sidebar collapse, bubble position, theme) so export/clear stay scoped to data, not settings. */
const DATA_KEYS = [
  "investlab.profile.v1",
  "investlab.goals.v1",
  "investlab.plans.v1",
  "investlab.activity.v1",
  "investlab.onboarding.v1",
];

export function SettingsPage({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [nudgesEnabled, setNudgesEnabled] = useNudgesEnabled();
  const [exporting, setExporting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [changePasswordError, setChangePasswordError] = React.useState<string | null>(null);
  const isSignedIn = status === "authenticated" && !!session?.user;

  const newPasswordIssues = getPasswordIssues(newPassword);
  const newPasswordsMismatch = confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
  const canSubmitPasswordChange = newPasswordIssues.length === 0 && confirmNewPassword.length > 0 && !newPasswordsMismatch;

  async function handleExport() {
    setExporting(true);
    try {
      const data: Record<string, unknown> = {};
      for (const key of DATA_KEYS) {
        const raw = window.localStorage.getItem(key);
        if (raw == null) continue;
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
      if (isSignedIn) {
        try {
          const res = await fetch("/api/plans");
          if (res.ok) data.syncedPlans = await res.json();
        } catch {
          // Export still proceeds with local data if the synced fetch fails.
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investlab-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported");
    } finally {
      setExporting(false);
    }
  }

  function handleClearLocalData() {
    DATA_KEYS.forEach((key) => window.localStorage.removeItem(key));
    toast.success("Local data cleared");
    window.location.reload();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitPasswordChange) return;
    setChangePasswordError(null);
    setChangingPassword(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setChangePasswordError(body.error ?? "Couldn't change your password — try again.");
        return;
      }
      toast.success("Password changed");
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Couldn't delete your account — try again.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Sign in to keep your plans synced across devices — everything still works fully offline without it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignedIn && session?.user ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "Account"} />
                  <AvatarFallback>{(session.user.name ?? session.user.email ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                </div>
                <Badge variant="outline" className="ml-2 border-positive/40 text-positive">
                  Synced
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.user.hasPassword && (
                  <Dialog
                    open={changePasswordOpen}
                    onOpenChange={(open) => {
                      setChangePasswordOpen(open);
                      if (!open) {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setChangePasswordError(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-1.5">
                        <KeyRound className="size-3.5" />
                        Change password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change password</DialogTitle>
                        <DialogDescription>Enter your current password and a new one.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleChangePassword} className="grid gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="current-password">Current password</Label>
                          <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="new-password">New password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            {newPassword.length === 0
                              ? passwordHint()
                              : newPasswordIssues.length > 0
                                ? newPasswordIssues[0]
                                : "Looks good."}
                          </p>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="confirm-new-password">Confirm new password</Label>
                          <Input
                            id="confirm-new-password"
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                          />
                          {newPasswordsMismatch && <p className="text-xs text-negative">Passwords don&apos;t match.</p>}
                        </div>
                        {changePasswordError && <p className="text-xs text-negative">{changePasswordError}</p>}
                        <DialogFooter>
                          <Button type="submit" disabled={changingPassword || !canSubmitPasswordChange} className="gap-1.5">
                            {changingPassword && <Loader2 className="size-3.5 animate-spin" />}
                            Change password
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
                <Button variant="outline" onClick={() => signOut()} className="gap-1.5">
                  <LogOut className="size-3.5" />
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                You&apos;re in Local Mode — plans are saved only in this browser. Sign in to back them up and use
                them anywhere.
              </p>
              <InlineAuth intro="Choose how you'd like to sign in." />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>How InvestLab looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2.5">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-3.5 text-center transition-colors hover:border-primary hover:bg-primary/5",
                  theme === opt.value && "border-primary bg-primary/5"
                )}
              >
                <opt.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-primary" />
            Guidance
          </CardTitle>
          <CardDescription>Proactive help while you use the app.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="nudges-enabled" className="text-sm font-normal text-muted-foreground">
              {nudgesEnabled ? "Show helpful nudges when you seem stuck" : "Nudges off"}
            </Label>
            <Switch id="nudges-enabled" checked={nudgesEnabled} onCheckedChange={setNudgesEnabled} />
          </div>
          <div className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => onNavigate?.({ kind: "onboarding" })} className="gap-1.5">
              <Rocket className="size-3.5" />
              Restart guided setup
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>
            Everything lives in this browser unless you sign in. See{" "}
            <button
              type="button"
              onClick={() => onNavigate?.({ kind: "help" })}
              className="text-primary underline-offset-2 hover:underline"
            >
              Help & Support
            </button>{" "}
            for exactly what&apos;s stored and why.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
            <Download className="size-3.5" />
            {exporting ? "Exporting…" : "Export my data"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                <Trash2 className="size-3.5" />
                Clear local data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear local data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your Financial Profile, goals, locally-saved plans, and activity log from this
                  browser. {isSignedIn ? "Anything already synced to your account is unaffected." : "This can't be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearLocalData} className="bg-destructive hover:bg-destructive/90">
                  Clear it
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {isSignedIn && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-4.5" />
              Danger zone
            </CardTitle>
            <CardDescription>Permanently delete your account and everything synced to it.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting} className="gap-1.5">
                  <Trash2 className="size-3.5" />
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your account, every plan and activity entry synced to it, and your
                    sign-in credentials. Plans saved only in this browser (not yet synced) are not affected. This
                    can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
