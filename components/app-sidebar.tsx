"use client";

import * as React from "react";
import NextLink from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Wallet,
  FileDown,
  UserCog,
  Target,
  GitCompare,
  History,
  PieChart,
  Calculator,
  Banknote,
  TrendingDown,
  Percent,
  Landmark,
  Vault,
  Lock,
  Repeat,
  CreditCard,
  Receipt,
  TrendingUp,
  PiggyBank,
  ShieldCheck,
  ArrowRightLeft,
  Baby,
  HandCoins,
  Palmtree,
  Scale,
  Settings,
  LogOut,
  HelpCircle,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { View } from "@/app/page";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLLAPSED_KEY = "investlab.sidebar-collapsed.v1";

// Tiny external store for the collapsed preference — same shape as every
// other localStorage-backed store in this app (see lib/stores/use-plans-store.ts),
// so reading it on mount goes through useSyncExternalStore instead of a
// useEffect+setState pair (avoids react-hooks/set-state-in-effect, and
// naturally handles SSR: server/first paint always reports "expanded").
let cachedCollapsed: boolean | null = null;
const collapsedListeners = new Set<() => void>();

function readCollapsed(): boolean {
  if (cachedCollapsed == null) {
    try {
      cachedCollapsed = window.localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      cachedCollapsed = false;
    }
  }
  return cachedCollapsed;
}

function getServerCollapsed(): boolean {
  return false;
}

function subscribeCollapsed(callback: () => void) {
  collapsedListeners.add(callback);
  return () => collapsedListeners.delete(callback);
}

function writeCollapsed(next: boolean) {
  cachedCollapsed = next;
  try {
    window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    // Preference just won't persist across reloads.
  }
  collapsedListeners.forEach((l) => l());
}

// Most items switch the SPA's internal `view` state; a few (Privacy Policy)
// are real routes outside that system entirely (see app/privacy/page.tsx's
// own comment on why it's a standalone page, not a `view`) and just need a
// plain external link styled to match.
type NavItem = { label: string; icon: LucideIcon } & ({ view: View; href?: never } | { view?: never; href: string });

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        view: { kind: "dashboard" },
      },
      { label: "My Plans", icon: Wallet, view: { kind: "plans" } },
      { label: "Export Report", icon: FileDown, view: { kind: "export-report" } },
    ],
  },
  {
    label: "Plan",
    items: [
      { label: "Financial Profile", icon: UserCog, view: { kind: "profile" } },
      { label: "Net Worth", icon: Scale, view: { kind: "net-worth" } },
      { label: "Goal Planner", icon: Target, view: { kind: "goals" } },
      { label: "Scenario Lab", icon: GitCompare, view: { kind: "compare" } },
    ],
  },
  {
    label: "Analyze",
    items: [
      {
        label: "Historical Analysis",
        icon: History,
        view: { kind: "historical" },
      },
      {
        label: "Portfolio Analyzer",
        icon: PieChart,
        view: { kind: "portfolio-analyzer" },
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        label: "SIP Calculator",
        icon: Calculator,
        view: { kind: "tools-sip" },
      },
      {
        label: "Lumpsum Calculator",
        icon: Banknote,
        view: { kind: "tools-lumpsum" },
      },
      {
        label: "SWP Calculator",
        icon: TrendingDown,
        view: { kind: "tools-swp" },
      },
      {
        label: "Inflation Calculator",
        icon: Percent,
        view: { kind: "tools-inflation" },
      },
      {
        label: "EPF Calculator",
        icon: Landmark,
        view: { kind: "tools-epf" },
      },
      {
        label: "PPF Calculator",
        icon: Vault,
        view: { kind: "tools-ppf" },
      },
      {
        label: "FD Calculator",
        icon: Lock,
        view: { kind: "tools-fd" },
      },
      {
        label: "RD Calculator",
        icon: Repeat,
        view: { kind: "tools-rd" },
      },
      {
        label: "EMI Calculator",
        icon: CreditCard,
        view: { kind: "tools-emi" },
      },
      {
        label: "GST Calculator",
        icon: Receipt,
        view: { kind: "tools-gst" },
      },
      {
        label: "XIRR Calculator",
        icon: TrendingUp,
        view: { kind: "tools-xirr" },
      },
      {
        label: "NPS Calculator",
        icon: PiggyBank,
        view: { kind: "tools-nps" },
      },
      {
        label: "Term Insurance Calculator",
        icon: ShieldCheck,
        view: { kind: "tools-term-insurance" },
      },
      {
        label: "STP Calculator",
        icon: ArrowRightLeft,
        view: { kind: "tools-stp" },
      },
      {
        label: "SSY Calculator",
        icon: Baby,
        view: { kind: "tools-ssy" },
      },
      {
        label: "SCSS Calculator",
        icon: HandCoins,
        view: { kind: "tools-scss" },
      },
      {
        label: "Retirement Calculator",
        icon: Palmtree,
        view: { kind: "tools-retirement" },
      },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { label: "Settings", icon: Settings, view: { kind: "settings" } },
  { label: "Help & Support", icon: HelpCircle, view: { kind: "help" } },
  { label: "Privacy Policy", icon: ScrollText, href: "/privacy" },
];

function isActive(a: View, b: View): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "plan" && b.kind === "plan") return a.id === b.id;
  return true;
}

/**
 * Shrinks its content to zero width smoothly regardless of the content's own
 * size, via the CSS grid `1fr` → `0fr` trick — a plain `max-width` transition
 * only starts moving once the max drops below the content's natural width,
 * so for short labels most of the animation is a no-op followed by a snap.
 */
function CollapsibleLabel({
  collapsed,
  className,
  innerClassName,
  children,
}: {
  collapsed: boolean;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid overflow-hidden transition-[grid-template-columns,opacity,margin-left] duration-200 ease-in-out",
        collapsed
          ? "ml-0 grid-cols-[0fr] opacity-0"
          : "ml-2.5 grid-cols-[1fr] opacity-100",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 overflow-hidden whitespace-nowrap",
          innerClassName,
        )}
      >
        {children}
      </span>
    </span>
  );
}

function NavButton({
  item,
  active,
  onSelect,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (view: View) => void;
  collapsed: boolean;
}) {
  const itemClassName = cn(
    "flex items-center rounded-lg text-sm font-medium transition-colors",
    collapsed ? "h-10 w-10 justify-center p-0 mx-auto" : "w-full px-2.5 py-2",
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
  const content = (
    <>
      <item.icon className="size-4 shrink-0" />
      <CollapsibleLabel collapsed={collapsed}>{item.label}</CollapsibleLabel>
    </>
  );
  const button =
    item.href != null ? (
      <NextLink href={item.href} aria-label={collapsed ? item.label : undefined} className={itemClassName}>
        {content}
      </NextLink>
    ) : (
      <button
        type="button"
        onClick={() => onSelect(item.view)}
        aria-label={collapsed ? item.label : undefined}
        className={itemClassName}
      >
        {content}
      </button>
    );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarNav({
  view,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: {
  view: View;
  onSelect: (view: View) => void;
  collapsed: boolean;
  /** Omit to hide the collapse/expand toggle (the mobile drawer instance doesn't need one). */
  onToggleCollapsed?: () => void;
}) {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && !!session?.user;
  const name = session?.user?.name ?? "Guest";

  // The nav list's scrollbar is hidden for a cleaner look, so a faded edge
  // is the only cue that there's more to scroll to — shown only on the
  // side(s) that actually have more content, not as a permanent decoration.
  const navScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = React.useState(false);
  const [canScrollDown, setCanScrollDown] = React.useState(false);

  const updateScrollShadows = React.useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  React.useEffect(() => {
    updateScrollShadows();
  }, [updateScrollShadows, collapsed]);

  React.useEffect(() => {
    window.addEventListener("resize", updateScrollShadows);
    return () => window.removeEventListener("resize", updateScrollShadows);
  }, [updateScrollShadows]);

  const accountRow = (
    <button
      type="button"
      onClick={isSignedIn ? undefined : () => onSelect({ kind: "settings" })}
      aria-label={
        collapsed
          ? `${name} · ${isSignedIn ? "Synced" : "Local Mode"}`
          : undefined
      }
      className={cn(
        "mt-2 flex items-center rounded-lg text-left transition-colors hover:bg-muted",
        collapsed ? "h-10 w-10 justify-center p-0 mx-auto" : "w-full px-2 py-2",
      )}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={session?.user?.image ?? undefined} alt={name} />
        <AvatarFallback className="text-xs">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {collapsed ? null : (
        <CollapsibleLabel
          collapsed={collapsed}
          className="flex-1"
          innerClassName="min-w-0"
        >
          <p className="truncate text-sm font-medium">{name}</p>
          <p
            className={cn(
              "truncate text-xs",
              isSignedIn ? "text-positive" : "text-muted-foreground",
            )}
          >
            {isSignedIn ? "Synced" : "Local Mode"}
          </p>
        </CollapsibleLabel>
      )}
    </button>
  );

  return (
    <nav
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r bg-background transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-5 top-0 z-10 py-3.5 flex size-5 items-center justify-center rounded-r-sm border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={navScrollRef}
          onScroll={updateScrollShadows}
          className={cn(
            "h-full overflow-y-auto overflow-x-hidden overscroll-contain py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            collapsed ? "px-1.5" : "px-3",
          )}
        >
          <div className="grid gap-5">
            {SECTIONS.map((section) => (
              <div key={section.label || "root"} className="grid gap-1">
                {section.label &&
                  (collapsed ? (
                    <div className="mx-1.5 mb-1 h-px bg-border" />
                  ) : (
                    <p className="px-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </p>
                  ))}
                {section.items.map((item) => (
                  <NavButton
                    key={item.label}
                    item={item}
                    active={item.view ? isActive(view, item.view) : false}
                    onSelect={onSelect}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {canScrollUp && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-background to-transparent" />
        )}
        {canScrollDown && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent" />
        )}
      </div>

      <div
        className={cn("shrink-0 border-t py-3", collapsed ? "px-1.5" : "px-3")}
      >
        <div className="grid gap-1">
          {FOOTER_ITEMS.map((item) => (
            <NavButton
              key={item.label}
              item={item}
              active={item.view ? isActive(view, item.view) : false}
              onSelect={onSelect}
              collapsed={collapsed}
            />
          ))}
        </div>

        {isSignedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{accountRow}</DropdownMenuTrigger>
            <DropdownMenuContent align="start" side={collapsed ? "right" : "top"} className="w-56">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={session?.user?.image ?? undefined} alt={name} />
                  <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSelect({ kind: "settings" })} className="gap-2">
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()} className="gap-2">
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{accountRow}</TooltipTrigger>
            <TooltipContent side="right">{name} · Local Mode</TooltipContent>
          </Tooltip>
        ) : (
          accountRow
        )}
      </div>
    </nav>
  );
}

export function AppSidebar({
  view,
  onViewChange,
  mobileOpen,
  onMobileClose,
}: {
  view: View;
  onViewChange: (view: View) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const collapsed = React.useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    getServerCollapsed,
  );

  function toggleCollapsed() {
    writeCollapsed(!readCollapsed());
  }

  function select(next: View) {
    onViewChange(next);
    onMobileClose();
  }

  return (
    <>
      <div
        className={cn(
          "sticky top-14 hidden h-[calc(100vh-3.5rem)] lg:block",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarNav
          view={view}
          onSelect={select}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="absolute inset-y-0 left-0 shadow-lg">
            <SidebarNav view={view} onSelect={select} collapsed={false} />
          </div>
        </div>
      )}
    </>
  );
}
