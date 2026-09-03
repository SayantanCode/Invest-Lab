// Indian-locale formatting helpers shared across the plan UI.

export function formatINR(value: number, opts: { decimals?: number } = {}): string {
  const { decimals = 0 } = opts;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

/** Compact lakh/crore form, e.g. ₹42.7L or ₹1.2Cr — used in tight chart labels. */
export function formatINRCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 7 ? "-01" : ""));
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: iso.length > 7 ? "numeric" : undefined });
}

/** Relative time for recent timestamps, e.g. "12m ago" — falls back to a date once it's old enough to be worth pinning down. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(iso.slice(0, 10));
}

/** e.g. "1 yr 3 mo", "6 mo", "2 yrs" — for fractional-year durations that shouldn't be shown as a raw decimal. */
export function formatYearsMonths(years: number): string {
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} ${y === 1 ? "yr" : "yrs"}`;
  return `${y} ${y === 1 ? "yr" : "yrs"} ${m} mo`;
}

export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", timeZone: "UTC" });
}
