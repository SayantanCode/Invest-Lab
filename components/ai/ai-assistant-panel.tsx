// Global entry point to the AI assistant — mounted once in app/layout.tsx so
// its open state (and any in-flight conversation) survives navigating
// between sidebar views. Signed out, it opens straight into InlineAuth
// instead of a "go elsewhere to sign in" message; signed in, it's the same
// ChatPanel used everywhere. Opened from the header's toggle button, or
// Alt+Shift+A from anywhere.

"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Bot, Loader2, X } from "lucide-react";

import { useAiPanelOpen } from "@/lib/stores/use-ai-panel-store";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAuth } from "@/components/ai/inline-auth";
import { ChatPanel } from "@/components/ai/chat-panel";

const REOPEN_KEY = "investlab.ai-bubble-reopen";

export function AiAssistantPanel() {
  const { status } = useSession();
  const [open, setOpen] = useAiPanelOpen();

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(REOPEN_KEY) === "true") {
        window.localStorage.removeItem(REOPEN_KEY);
        setOpen(true);
      }
    } catch {
      // Non-fatal — worst case the panel just doesn't auto-reopen after a Google redirect.
    }
    // Runs once on mount only — setOpen is a stable module-level setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  if (!open) return null;

  return (
  <Card className="fixed right-4 bottom-4 z-50 flex h-[560px] max-h-[calc(100vh-6rem)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border-border/70 bg-background shadow-2xl sm:right-6 sm:bottom-6">
    {/* Header */}
    <CardHeader className="relative flex h-[60px] shrink-0 flex-row items-center border-b border-border/70 px-4 py-0">
      <CardTitle className="flex items-center gap-3">
        {/* Bot icon */}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="size-[18px] text-primary" />
        </div>

        {/* Title + status */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">
            AI Assistant
          </span>

          <span className="mt-1 flex items-center gap-1.5 text-[11px] font-normal leading-none text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>
      </CardTitle>

      {/* Close */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Close AI assistant"
        className="
          absolute
          right-3
          top-[35%]
          flex
          size-8
          -translate-y-1/2
          items-center
          justify-center
          rounded-md
          text-muted-foreground
          transition-colors
          hover:bg-muted
          hover:text-foreground
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring
        "
      >
        <X className="size-[17px]" />
      </button>
    </CardHeader>

    {/* Body */}
    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
      {status === "loading" ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>

            <p className="text-xs text-muted-foreground">
              Starting assistant...
            </p>
          </div>
        </div>
      ) : status === "authenticated" ? (
        <ChatPanel messagesClassName="min-h-0 flex-1" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <InlineAuth />
        </div>
      )}
    </CardContent>
  </Card>
);
}
