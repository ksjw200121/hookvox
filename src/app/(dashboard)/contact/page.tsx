"use client";

import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black mb-2">聯繫我們</h1>
        <p className="text-white/40">
          訂閱、付款、功能問題都歡迎透過以下方式聯絡我們，我們會盡快回覆。
        </p>
      </div>

      <div className="glass rounded-2xl p-8 border border-white/10 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white/50 mb-2">信箱</h2>
          <a
            href="mailto:ksjw200121@gmail.com"
            className="text-lg font-medium text-brand-400 hover:text-brand-300 transition-colors break-all"
          >
            ksjw200121@gmail.com
          </a>
          <p className="text-white/40 text-sm mt-1">
            來信請註明訂單編號或問題類型，我們會於 1～3 個工作天內回覆。
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white/50 mb-2">Instagram</h2>
          <a
            href="https://www.instagram.com/fang.0721/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-medium text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-2"
          >
            @fang.0721
            <span className="text-xs text-white/40">（另開分頁）</span>
          </a>
          <p className="text-white/40 text-sm mt-1">
            私訊我們，適合即時詢問或較簡短的問題。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block text-white/60 hover:text-white text-sm font-medium mt-4"
        >
          ← 返回控制台
        </Link>
      </div>
    </div>
  );
}
