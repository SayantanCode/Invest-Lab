"use client";

import * as React from "react";
import { ChevronDown, Compass } from "lucide-react";

import type { View } from "@/app/page";
import { HELP_SECTIONS, HELP_TOPICS } from "@/components/help/help-topics";
import { HELP_SCENARIOS } from "@/components/help/help-scenarios";
import { useOnboardingStore } from "@/lib/stores/use-onboarding-store";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function AccordionRow({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b py-3 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
        {question}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
    </details>
  );
}

export function HelpSupport({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { reset } = useOnboardingStore();

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-start gap-2.5">
            <Compass className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Not sure where to start?</p>
              <p className="text-xs text-muted-foreground">
                The guided setup asks a few simple questions and builds a real plan for you.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              reset();
              onNavigate({ kind: "onboarding" });
            }}
          >
            Run guided setup
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <h3 className="text-sm font-semibold">Worked examples</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {HELP_SCENARIOS.map((s) => (
            <Card key={s.key} className="flex flex-col">
              <CardHeader className="flex-row items-start gap-2.5 space-y-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="size-4.5" />
                </span>
                <p className="text-sm italic leading-tight text-muted-foreground">{s.persona}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="text-sm">{s.summary}</p>
                <ol className="grid list-decimal gap-1.5 pl-4 text-xs text-muted-foreground">
                  {s.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-fit"
                  onClick={() => onNavigate(s.startView)}
                >
                  {s.startLabel}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-semibold">Questions & answers</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {HELP_SECTIONS.map((section) => (
            <Card key={section} className={cn("h-fit")}>
              <CardHeader>
                <CardTitle className="text-base">{section}</CardTitle>
              </CardHeader>
              <CardContent className="grid">
                {HELP_TOPICS.filter((t) => t.section === section).map((t) => (
                  <AccordionRow key={t.question} question={t.question} answer={t.answer} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
