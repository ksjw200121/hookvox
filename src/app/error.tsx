"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the actual error for debugging — never show raw details to user
    console.error("Page error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "40px",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 16 }}>
        發生錯誤
      </h1>

      <p style={{ marginBottom: 24, color: "#ccc" }}>
        頁面載入時發生問題，請重新整理或稍後再試。
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
        重新整理
      </button>
    </div>
  );
}
