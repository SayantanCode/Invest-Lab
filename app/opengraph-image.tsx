import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Social share-card preview (WhatsApp/X/LinkedIn/Slack link unfurls). The
// logo is read from disk and inlined as a base64 data URI — ImageResponse's
// Satori renderer can't resolve a plain "/investlab-logo.png" URL at build
// time, so the bytes have to be embedded directly into the <img src>.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoDataUri = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "investlab-logo.png")).toString("base64")}`;

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
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori) requires a plain <img>, not next/image */}
          <img src={logoDataUri} width={84} height={84} alt="" />
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
