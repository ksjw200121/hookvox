import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Hookvox - 爆款腳本生成器";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "#ef4444",
            color: "white",
            fontSize: 40,
            fontWeight: 900,
            marginBottom: 24,
          }}
        >
          H
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "white",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}
        >
          Hookvox
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 40,
          }}
        >
          爆款腳本生成器
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 100,
            padding: "12px 32px",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#ef4444",
            }}
          />
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.7)" }}>
            分析爆款公式，套用到你的內容
          </div>
        </div>

        {/* Features row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 48,
            color: "rgba(255,255,255,0.35)",
            fontSize: 18,
          }}
        >
          <span>🔍 爆款拆解</span>
          <span>✍️ 腳本生成</span>
          <span>📋 分鏡表</span>
          <span>💥 標題生成</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
