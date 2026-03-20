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
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl">⚠</div>
        <h1 className="text-3xl font-black">發生錯誤</h1>
        <p className="text-white/60 leading-relaxed">
          頁面載入時發生問題，請重新整理或稍後再試。
          <br />
          若問題持續，請聯絡客服協助處理。
        </p>
        <button
          onClick={() => reset()}
          className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          重新整理
        </button>
      </div>
    </div>
  );
}
