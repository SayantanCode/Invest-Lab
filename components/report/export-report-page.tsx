"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileText, Loader2, Mail, Sparkles } from "lucide-react";

import { useProfileStore } from "@/lib/stores/use-profile-store";
import { useGoalStore } from "@/lib/stores/use-goal-store";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { downloadBlob } from "@/lib/download";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IncludedSection {
  label: string;
  detail: string;
  included: boolean;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function ExportReportPage({ onNavigate }: { onNavigate?: (view: { kind: "profile" | "goals" | "plans" }) => void }) {
  const { data: session, status } = useSession();
  const { profile } = useProfileStore();
  const { goals } = useGoalStore();
  const { plans } = useSavedPlansStore();
  const { entries } = useActivityLog();
  const [generating, setGenerating] = React.useState(false);
  const [emailing, setEmailing] = React.useState(false);
  const isSignedIn = status === "authenticated" && !!session?.user?.email;

  const hasAnything = !!profile || goals.length > 0 || plans.length > 0;

  const sections: IncludedSection[] = [
    { label: "Financial profile", detail: profile ? "Income, expenses, insurance, and emergency fund." : "Not set up yet.", included: !!profile },
    { label: "Priorities", detail: profile ? "What to fix first, in plain language." : "Needs a financial profile first.", included: !!profile },
    { label: "Goals", detail: goals.length > 0 ? `${goals.length} goal${goals.length === 1 ? "" : "s"}, with required SIPs and timing.` : "No goals saved yet.", included: goals.length > 0 },
    { label: "Plans", detail: plans.length > 0 ? `${plans.length} plan${plans.length === 1 ? "" : "s"}, projected across all three scenarios.` : "No plans saved yet.", included: plans.length > 0 },
    { label: "Recent activity", detail: entries.length > 0 ? `Last ${Math.min(10, entries.length)} change${entries.length === 1 ? "" : "s"}.` : "Nothing logged yet.", included: entries.length > 0 },
  ];

  async function buildReportPdfBlob(): Promise<Blob> {
    const [{ pdf }, { ReportDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/report/report-document"),
    ]);
    return pdf(
      <ReportDocument profile={profile} goals={goals} plans={plans} activity={entries} generatedAt={new Date().toISOString()} />
    ).toBlob();
  }

  async function handleDownload() {
    setGenerating(true);
    try {
      const blob = await buildReportPdfBlob();
      downloadBlob(`investlab-report-${new Date().toISOString().slice(0, 10)}.pdf`, blob);
      toast.success("Report downloaded");
    } catch {
      toast.error("Couldn't generate the report — try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleEmailReport() {
    setEmailing(true);
    try {
      const blob = await buildReportPdfBlob();
      const pdfBase64 = await blobToBase64(blob);
      const res = await fetch("/api/account/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't send the email — try again.");
        return;
      }
      toast.success(`Sent to ${session?.user?.email}`);
    } catch {
      toast.error("Couldn't generate or send the report — try again.");
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4.5 text-primary" />
            What&apos;s included
          </CardTitle>
          <CardDescription>
            A plain-language PDF of your saved numbers — download it, or hand it to any AI assistant and ask
            questions about your own situation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {sections.map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${s.included ? "text-positive" : "text-muted-foreground/40"}`} />
              <div>
                <p className={`text-sm font-medium ${s.included ? "" : "text-muted-foreground"}`}>{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {hasAnything ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              <p className="text-sm text-muted-foreground">Everything above is generated fresh from what you&apos;ve saved.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isSignedIn && (
                <Button variant="outline" onClick={handleEmailReport} disabled={emailing} className="gap-1.5">
                  {emailing ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                  {emailing ? "Sending…" : "Email me a copy"}
                </Button>
              )}
              <Button onClick={handleDownload} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                {generating ? "Generating…" : "Download PDF Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              There&apos;s nothing to report yet — set up your financial profile, add a goal, or save a plan first.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onNavigate?.({ kind: "profile" })}>
                Financial Profile
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.({ kind: "goals" })}>
                Goal Planner
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.({ kind: "plans" })}>
                My Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
