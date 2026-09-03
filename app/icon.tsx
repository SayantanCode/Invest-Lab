import { ImageResponse } from "next/og";

// Matches the header's own logo mark exactly (bg-primary rounded-md square +
// lucide-react's Calculator glyph) — #315dd4 is that primary blue's actual
// rendered sRGB value (read off the live page's --primary token, which is
// declared in oklch and can't be pasted directly into an ImageResponse/Satori
// style). The glyph's path data is copied from lucide-react's calculator
// icon rather than imported, since this route runs in a server-only context
// that can't call lucide-react's (client-marked) icon components.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#315dd4",
          borderRadius: 7,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="20" x="4" y="2" rx="2" />
          <line x1="8" x2="16" y1="6" y2="6" />
          <line x1="16" x2="16" y1="14" y2="18" />
          <path d="M16 10h.01" />
          <path d="M12 10h.01" />
          <path d="M8 10h.01" />
          <path d="M12 14h.01" />
          <path d="M8 14h.01" />
          <path d="M12 18h.01" />
          <path d="M8 18h.01" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
