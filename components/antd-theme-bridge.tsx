"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { ConfigProvider, theme as antdTheme } from "antd";

// Resolved once via getComputedStyle against the app's own OKLCH tokens
// (app/globals.css --primary/--background) so antd's components read as
// part of the same design system instead of a bolted-on default blue.
// Re-resolve these (render a probe element, read getComputedStyle, quantize
// through a 1x1 canvas to get a plain rgb() antd's color lib can parse) any
// time globals.css's --primary/--background change — antd can't read the
// oklch()/lab() values directly.
const PALETTE = {
  light: { colorPrimary: "#315DD4", colorBgBase: "#F3F7FC" },
  dark: { colorPrimary: "#5587FF", colorBgBase: "#020710" },
};

/** Keeps antd's ConfigProvider in lockstep with next-themes, so every antd component follows the same light/dark/system choice as the rest of the app. */
export function AntdThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  // Mirrors next-themes' own hydration-safe pattern: the server always
  // renders "light" (it can't know the client's preference), so the first
  // client render must match before swapping post-mount. useSyncExternalStore
  // (no-op subscribe) reports false during SSR/hydration and true after,
  // without the cascading re-render a useEffect+setState pair would cause.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const palette = PALETTE[mode];

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: palette.colorPrimary,
          colorBgBase: palette.colorBgBase,
          borderRadius: 8,
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
