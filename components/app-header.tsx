"use client";

import * as React from "react";
import Image from "next/image";
import { Bot, CloudSync, Menu, Plus, Sparkles } from "lucide-react";

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
          <Image
            src="/investlab-logo.png"
            alt=""
            width={28}
            height={28}
            className="shrink-0"
            priority
          />
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
                  "group relative h-9 gap-2 overflow-hidden rounded-xl px-3",
                  "border border-border/60",
                  "bg-background/70",
                  "text-muted-foreground",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.15)]",
                  "transition-all duration-300",
                  "hover:border-primary/25 hover:text-foreground",
                  "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.18)]",
                  aiPanelOpen &&
                    "border-primary/30 bg-primary/5 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_10px_rgba(59,130,246,0.12)]",
                )}
              >
                {/* Very subtle animated gradient wash */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0",
                    "bg-linear-to-r from-primary/0 via-primary/8 to-violet-500/0",
                    "opacity-0",
                    "animate-[aiShimmer_7s_ease-in-out_infinite]",
                    "group-hover:opacity-100",
                    aiPanelOpen && "opacity-100",
                  )}
                />

                {/* Icon */}
                <span className="relative flex size-4 items-center justify-center">
                  <Sparkles
                    className={cn(
                      "size-4 transition-all duration-300",
                      "group-hover:text-primary group-hover:drop-shadow-[0_0_5px_rgba(99,102,241,0.45)]",
                      aiPanelOpen &&
                        "text-primary drop-shadow-[0_0_5px_rgba(99,102,241,0.4)]",
                    )}
                  />
                </span>

                {/* Label */}
                <span className="relative text-xs font-medium tracking-tight">
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
