"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Keyed by theme in the parent so a theme change fully remounts this (fresh
 * container, fresh effect) instead of us clearing DOM out from under
 * TradingView's own async script mid-init — that race is what throws
 * "Cannot read properties of null" from inside their embed script.
 */
function TradingViewWidget({ colorTheme }: { colorTheme: "dark" | "light" }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || container.childElementCount > 0) return;

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        ["SENSEX", "BSE:SENSEX|1D"],
        ["USD/INR", "FX_IDC:USDINR|1D"],
      ],
      chartOnly: false,
      width: "100%",
      height: 220,
      locale: "en",
      colorTheme,
      autosize: false,
      showVolume: false,
      isTransparent: false,
    });
    container.appendChild(script);
    // No cleanup: TradingView's embed script replaces itself with an iframe
    // asynchronously (after the external file loads), and removing the
    // script node before that finishes throws inside their code. Letting
    // React tear down the whole container on real unmount is safe; the
    // childElementCount guard above prevents a duplicate append if this
    // effect re-runs (e.g. React Strict Mode's dev-only double-invoke).
  }, [colorTheme]);

  return <div className="tradingview-widget-container" ref={containerRef} />;
}

export function MarketSnapshot() {
  const { resolvedTheme } = useTheme();
  const colorTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <TradingViewWidget key={colorTheme} colorTheme={colorTheme} />
        <p className="mt-2 text-xs text-muted-foreground">
          Live market data via TradingView (free tier — may lag up to ~15 min). NSE data (NIFTY) isn&apos;t available on
          TradingView&apos;s free embed, so this shows SENSEX and the USD/INR rate instead. Not affiliated with BSE or
          TradingView.
        </p>
      </CardContent>
    </Card>
  );
}
