"use client";

import * as React from "react";
import { Bot, Calculator, CloudSync, Menu, Plus } from "lucide-react";

import { useAiPanelOpen } from "@/lib/stores/use-ai-panel-store";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppHeader({
  onImport,
  onNewPlan,
  onMenuClick,
}: {
  onImport: (json: string) => void;
  onNewPlan: () => void;
  /** Opens the mobile sidebar drawer — the button only shows below the lg breakpoint. */
  onMenuClick?: () => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [aiPanelOpen, setAiPanelOpen] = useAiPanelOpen();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImport(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-1.5 lg:hidden"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </Button>
          )}
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Calculator className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">InvestLab</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Plan. Simulate. Grow.
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Import plan from JSON"
              >
                <CloudSync className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import plan (JSON)</TooltipContent>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFile}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={aiPanelOpen}
                aria-label="Open InvestLab AI"
                onClick={() => setAiPanelOpen(!aiPanelOpen)}
                className={cn(
                  "group relative h-9 gap-2 overflow-hidden rounded-lg px-2.5",
                  "border border-transparent",
                  "transition-all duration-300",
                  "hover:border-primary/20 hover:bg-primary/5",
                  aiPanelOpen &&
                    "border-primary/20 bg-primary/10 text-primary shadow-sm",
                )}
              >
                {/* Ambient glow */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute -inset-3 rounded-full",
                    "bg-linear-to-r from-primary/20 via-fuchsia-500/20 to-amber-400/20",
                    "opacity-0 blur-xl transition-opacity duration-500",
                    "group-hover:opacity-100",
                    aiPanelOpen && "opacity-100",
                  )}
                />

                {/* AI icon container */}
                <span
                  className={cn(
                    "relative flex size-6 items-center justify-center rounded-md",
                    "bg-linear-to-br from-primary via-fuchsia-500 to-amber-400",
                    "text-white shadow-sm",
                    "transition-transform duration-300",
                    "group-hover:scale-105",
                    aiPanelOpen && "scale-105",
                  )}
                >
                  <Bot className="size-3.5" />

                  {/* tiny sparkle */}
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-white shadow-[0_0_6px_white]"
                  />
                </span>

                {/* Label */}
                <span className="relative hidden text-xs font-medium sm:inline">
                  AI
                </span>
              </Button>
            </TooltipTrigger>

            <TooltipContent side="bottom">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">InvestLab AI</span>
                <span className="text-xs text-muted-foreground">
                  Plan, analyze & simulate your goals
                </span>
              </div>
            </TooltipContent>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-border" />
          <ThemeToggle />
          <Button size="sm" onClick={onNewPlan} className="gap-1.5">
            <Plus className="size-3.5" />
            New Plan
          </Button>
        </div>
      </div>
    </header>
  );
}
