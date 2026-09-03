"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

// Route-level error boundary — catches anything thrown while rendering
// app/page.tsx and below (a crash in one calculator shouldn't have to mean a
// blank white screen). Must be a Client Component; Next.js renders this in
// place of the failed segment and passes `reset` to retry rendering it.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-xl bg-negative/10 text-negative">
        <AlertTriangle className="size-7" />
      </span>
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page hit an unexpected error. Your saved data is untouched — try again, or reload the page.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()} className="gap-1.5">
          <RotateCcw className="size-3.5" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </div>
  );
}
