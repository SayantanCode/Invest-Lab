"use client";

import * as React from "react";

// Only fires if the root layout itself throws (a crash in ThemeProvider,
// SessionProvider, etc. — not a normal page-level error, see app/error.tsx
// for that). Next.js requires this to render its own <html>/<body> since it
// replaces the root layout entirely, so it deliberately doesn't import
// globals.css, fonts, or any app component — none of that infrastructure can
// be trusted to still work if this is what's rendering.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f4f7ff",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#315dd4",
            color: "white",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          !
        </div>
        <div style={{ display: "grid", gap: 8, maxWidth: 380 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>InvestLab hit an unexpected error</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            Your saved data is untouched. Reloading usually fixes this.
          </p>
        </div>
        <button
          onClick={() => reset()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#315dd4",
            color: "white",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
