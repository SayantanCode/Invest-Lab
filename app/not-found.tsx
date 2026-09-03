import Link from "next/link";
import { Calculator, Home } from "lucide-react";

import { Button } from "@/components/ui/button";

// The app itself only ever has one real route ("/" — every calculator/tool
// is client-side view state inside it, not a distinct URL, see app/page.tsx's
// `view` union), so this only ever fires for a genuinely wrong path: a typo,
// an old bookmark, a dead link from somewhere else.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Calculator className="size-7" />
      </span>
      <div className="grid gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          That page doesn&apos;t exist. Every InvestLab tool and calculator lives on the dashboard — head back and
          pick one from the sidebar.
        </p>
      </div>
      <Button asChild className="gap-1.5">
        <Link href="/">
          <Home className="size-3.5" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
