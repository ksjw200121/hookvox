"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto text-center space-y-6 py-20 animate-fade-in">
      <div className="text-6xl">⚠</div>
      <h1 className="text-3xl font-black">頁面發生錯誤</h1>
      <p className="text-white/60 leading-relaxed">
        載入時發生問題，請點擊下方按鈕重試。
        <br />
        若問題持續發生，請聯絡客服或稍後再試。
      </p>
      <button
        onClick={() => reset()}
        className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
      >
        重試
      </button>
    </div>
  );
}
