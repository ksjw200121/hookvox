"use client";

const EBOOK_URL = "https://core.newebpay.com/EPG/JS2026/hySmp0";

const features = [
  "36 組違規 vs 合規對照表",
  "真實罰款金額一覽",
  "逐條白話法規解析",
  "44 頁 PDF 即買即下載",
  "2026/4 最新更新版本",
];

const tags = ["保險業", "美業", "直銷", "微商"];

interface EbookBannerProps {
  /** compact = 方案頁小橫幅；full = 首頁大區塊（預設） */
  variant?: "full" | "compact";
}

export default function EbookBanner({ variant = "full" }: EbookBannerProps) {
  if (variant === "compact") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <a
          href={EBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-6 py-5 hover:border-yellow-400/40 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl select-none">📖</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">IG 合規經營地雷指南</span>
                <span className="text-xs bg-yellow-400/15 text-yellow-300 px-2 py-0.5 rounded-full font-medium">限時優惠</span>
              </div>
              <p className="text-white/50 text-xs mt-0.5">
                44頁 PDF・36組違規 vs 合規對照表・保險/美業/直銷/微商適用
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs line-through text-white/30">NT$2,000</div>
              <div className="font-black text-yellow-300 text-lg leading-none">NT$1,000</div>
            </div>
            <div className="bg-yellow-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl group-hover:bg-yellow-300 transition-colors whitespace-nowrap">
              立即購買 →
            </div>
          </div>
        </a>
      </div>
    );
  }

  return (
    <section className="py-20 px-6 bg-dark-800/50">
      <div className="max-w-5xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-sm px-4 py-2 rounded-full mb-6">
            📖 金孫獨家電子書
          </div>
          <h2 className="text-4xl font-black mb-3">
            IG 合規經營地雷指南
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            保險・美業・直銷・微商 皆適用｜用白話文搞懂 IG 法規，避開違規地雷，安心經營自媒體
          </p>
        </div>

        {/* 主卡片 */}
        <div className="rounded-3xl border border-yellow-400/15 bg-gradient-to-br from-yellow-400/5 via-transparent to-transparent overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* 左側：封面預覽區 */}
            <div className="flex flex-col items-center justify-center p-10 border-b md:border-b-0 md:border-r border-yellow-400/10">
              <div className="relative">
                {/* 電子書封面模擬 */}
                <div className="w-48 h-64 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_20px_60px_rgba(250,204,21,0.25)] flex flex-col items-center justify-center p-5 text-center">
                  <div className="text-black/70 text-xs font-bold uppercase tracking-widest mb-2">電子書</div>
                  <div className="text-black font-black text-lg leading-tight mb-3">
                    IG 合規<br />經營<br />地雷指南
                  </div>
                  <div className="text-black/60 text-xs">by 金孫</div>
                  <div className="mt-4 text-black/50 text-xs">44 頁 PDF</div>
                </div>
                {/* 最新標籤 */}
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  2026 最新
                </div>
              </div>
              {/* 適用對象標籤 */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 右側：內容 */}
            <div className="p-10 flex flex-col justify-center">
              <h3 className="text-xl font-black mb-2 text-white">
                你是自媒體經營者嗎？
              </h3>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                每次發文都擔心違規被下架？罰款到底有多重？<br />
                這本 44 頁指南用最白話的語言，帶你一次搞懂 IG 的合規眉角。
              </p>

              {/* 功能列表 */}
              <ul className="space-y-3 mb-8">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                    <span className="w-5 h-5 rounded-full bg-yellow-400/15 text-yellow-300 flex items-center justify-center text-xs shrink-0">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* 定價 + 按鈕 */}
              <div className="flex items-end gap-4 mb-4">
                <div>
                  <div className="text-sm line-through text-white/30 mb-0.5">原價 NT$2,000</div>
                  <div className="text-4xl font-black text-yellow-300">NT$1,000</div>
                  <div className="text-xs text-yellow-400/70 mt-1">限時優惠・即買即下載</div>
                </div>
              </div>

              <a
                href={EBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] text-base"
              >
                📖 立即購買電子書
              </a>

              <p className="text-white/25 text-xs mt-3">
                付款後由藍新科技處理，數位商品恕不退款
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
