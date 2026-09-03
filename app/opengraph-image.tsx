import { ImageResponse } from "next/og";

// Social share-card preview (WhatsApp/X/LinkedIn/Slack link unfurls). Same
// "inline the SVG, don't import lucide-react" reasoning as app/icon.tsx —
// this route runs in a server-only context that can't call lucide-react's
// (client-marked) icon components.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 28,
          padding: "0 96px",
          background: "#f4f7ff",
          backgroundImage: "linear-gradient(135deg, #eef2ff 0%, #f4f7ff 55%, #ffffff 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: 20,
              background: "#315dd4",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#0f172a", letterSpacing: -1.5 }}>InvestLab</div>
        </div>

        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#1e293b", maxWidth: 920, lineHeight: 1.25 }}>
          Model your money before you invest it
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#475569", maxWidth: 880, lineHeight: 1.5 }}>
          Free SIP, EMI, PPF, NPS &amp; retirement calculators, goal planning, and real historical fund backtesting —
          no signup required.
        </div>
      </div>
    ),
    { ...size }
  );
}
