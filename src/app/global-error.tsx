"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          padding: "40px",
          fontFamily: "sans-serif",
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 16 }}>
          系統錯誤
        </h1>

        <p style={{ marginBottom: 24, color: "#ccc" }}>
          {error?.message || "發生未知錯誤"}
        </p>

        <button
          onClick={() => reset()}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          再試一次
        </button>
      </body>
    </html>
  );
}