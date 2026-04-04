"use client";

import Link from "next/link";
import { useState } from "react";

/* ─── 紅色標註箭頭元件 ─── */
function Arrow({ label, dir = "down" }: { label: string; dir?: "down" | "right" | "left" }) {
  const arrow = dir === "right" ? "→" : dir === "left" ? "←" : "↓";
  return (
    <span className="inline-flex items-center gap-1 text-red-400 font-black text-base animate-pulse select-none">
      <span className="text-xl">{arrow}</span> {label}
    </span>
  );
}

/* ─── 步驟卡片元件 ─── */
function StepCard({
  num,
  title,
  children,
  tip,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
  tip?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-red-500 text-white font-black text-sm flex items-center justify-center">
          {num}
        </span>
        <h3 className="text-lg md:text-xl font-black text-white leading-snug pt-1">{title}</h3>
      </div>
      <div className="pl-12 space-y-3 text-white/80 text-sm leading-relaxed">{children}</div>
      {tip && (
        <div className="ml-12 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <span className="text-amber-300 font-bold text-xs">💡 小提醒：</span>
          <span className="text-white/70 text-sm ml-1">{tip}</span>
        </div>
      )}
    </div>
  );
}

/* ─── 模擬 UI 區塊（帶紅色箭頭標註） ─── */
function MockUI({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-4 md:p-5 space-y-3 ${className}`}>
      {children}
    </div>
  );
}

/* ─── 分隔線 ─── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
      <span className="text-red-400 font-bold text-sm whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
    </div>
  );
}

/* ─── 主要分類 TAB ─── */
const TABS = [
  { id: "start", label: "🚀 註冊 / 登入" },
  { id: "analyze", label: "🔍 爆款分析" },
  { id: "generate", label: "✨ 生成腳本" },
  { id: "ig", label: "📱 IG Reels 攻略" },
  { id: "tips", label: "🔥 實戰技巧" },
  { id: "database", label: "📚 資料庫" },
  { id: "extend", label: "🎯 爆款延伸" },
  { id: "plans", label: "💳 方案 / 帳單" },
  { id: "settings", label: "⚙️ 設定" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function GuidePage() {
  const [tab, setTab] = useState<TabId>("start");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ─── 頂部導覽 ─── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-lg">
            Hookvox <span className="text-white/40 text-xs font-normal ml-1">教學指南</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/analyze" className="text-sm text-white/60 hover:text-white transition">
              爆款分析
            </Link>
            <Link href="/register" className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition">
              免費試用
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 標題區 ─── */}
      <section className="pt-16 pb-8 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-black mb-3">
          Hookvox 完整功能教學
        </h1>
        <p className="text-white/50 text-base max-w-xl mx-auto">
          從註冊到付費，每個步驟都拆開講。<br className="hidden sm:block" />
          照著做，第一次用也能輕鬆上手。
        </p>
      </section>

      {/* ─── TAB 切換 ─── */}
      <div className="sticky top-14 z-40 bg-black/90 backdrop-blur border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 內容區 ─── */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* ===== 註冊 / 登入 ===== */}
        {tab === "start" && (
          <>
            <StepCard num={1} title="前往註冊頁面">
              <p>打開 <code className="bg-white/10 px-2 py-0.5 rounded text-red-300">hookvox-1yib.vercel.app/register</code></p>
              <p>或在任何頁面點右上角的 <span className="text-red-400 font-bold">「註冊」</span> 按鈕。</p>
            </StepCard>

            <StepCard num={2} title="填寫註冊資料" tip="密碼至少 8 碼，要包含大寫、小寫、數字。">
              <MockUI>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Arrow label="填你的 Email" dir="right" />
                    <div className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/40 text-sm">
                      請輸入你的 Email
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Arrow label="設定密碼" dir="right" />
                    <div className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/40 text-sm">
                      至少 8 碼，含大寫、小寫、數字
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Arrow label="等它顯示「成功 ✓」" dir="right" />
                    <div className="h-10 rounded-lg bg-green-900/30 border border-green-500/30 flex items-center px-3 text-green-400 text-sm gap-2">
                      ✅ 成功! <span className="text-white/30 text-xs">CLOUDFLARE</span>
                    </div>
                  </div>
                </div>
              </MockUI>
              <div className="pt-2 flex justify-center">
                <Arrow label="全部填好後，按這個按鈕" dir="down" />
              </div>
              <MockUI className="!bg-red-500/20 !border-red-500/30">
                <div className="text-center text-red-300 font-bold py-1">立即註冊</div>
              </MockUI>
              <p className="text-white/60">註冊成功後會自動登入，並帶你到控制台。</p>
            </StepCard>

            <StepCard num={3} title="已有帳號？登入方式">
              <p>到 <code className="bg-white/10 px-2 py-0.5 rounded text-red-300">hookvox-1yib.vercel.app/login</code></p>
              <p>輸入 Email + 密碼 → 等真人驗證顯示「成功 ✓」→ 按 <span className="text-red-400 font-bold">「立即登入」</span></p>
              <p className="text-amber-300">⚠️ 一定要等 Cloudflare 驗證出現綠色勾勾再按登入，不然會失敗！</p>
            </StepCard>

            <Divider label="註冊完成 → 進入控制台" />

            <StepCard num={4} title="控制台：你的使用總覽">
              <MockUI>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white/50 text-xs">本月總使用量</div>
                    <div className="text-2xl font-black text-white">3 <span className="text-sm text-white/40 font-normal">/ 400 次</span></div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-1">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: "1%" }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <Arrow label="你的方案" dir="left" />
                    <div className="text-white font-bold">專業版</div>
                  </div>
                </div>
              </MockUI>
              <p>這裡可以看到你的 <span className="text-white font-bold">方案、剩餘次數、最近使用紀錄</span>。</p>
              <p>下面還有快速入口：<span className="text-red-400">「開始分析 →」</span> 和 <span className="text-red-400">「查看資料庫 →」</span></p>
            </StepCard>
          </>
        )}

        {/* ===== 爆款分析 ===== */}
        {tab === "analyze" && (
          <>
            <StepCard num={1} title="進入爆款分析頁面">
              <p>點上方導覽列的 <span className="text-red-400 font-bold">「爆款分析」</span>。</p>
              <MockUI>
                <div className="flex gap-4 text-sm">
                  <span className="text-white/40">控制台</span>
                  <span className="text-red-400 font-bold border-b-2 border-red-400 pb-1">爆款分析 <Arrow label="" dir="down" /></span>
                  <span className="text-white/40">爆款資料庫</span>
                  <span className="text-white/40">方案</span>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={2} title="選擇分析來源（三選一）">
              <MockUI>
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-3">
                    <Arrow label="方式 A" dir="right" />
                    <span className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold">
                      上傳音訊 / 影片
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Arrow label="方式 B" dir="right" />
                    <span className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm">
                      貼逐字稿
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Arrow label="方式 C" dir="right" />
                    <span className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm">
                      YouTube Shorts 連結
                    </span>
                  </div>
                </div>
              </MockUI>
              <p><span className="text-white font-bold">方式 A：上傳檔案</span> — 點擊上傳區選擇你的影片或音訊檔。</p>
              <p><span className="text-white font-bold">方式 B：貼逐字稿</span> — 如果你已經有影片的文字稿，直接貼上。</p>
              <p><span className="text-white font-bold">方式 C：YouTube Shorts 連結</span> — 貼上 YouTube Shorts 的網址。</p>
            </StepCard>

            <StepCard num={3} title="上傳檔案注意事項" tip="iPhone 拍的影片通常是 .mov 格式，系統已支援自動轉檔。但建議先壓縮到 24MB 以下。">
              <div className="rounded-xl bg-red-500/10 border border-red-500/25 p-4 space-y-2">
                <div className="text-red-300 font-bold">📏 檔案大小限制：24MB 以下</div>
                <p className="text-white/70 text-sm">
                  轉錄服務單檔上限約 25MB。建議壓到 <span className="text-red-300 font-bold">24MB 以下</span> 最穩。
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                <div className="text-white font-bold text-sm">壓縮教學（用剪映 / CapCut）：</div>
                <ol className="list-decimal list-inside space-y-1 text-white/70 text-sm">
                  <li>開啟剪映 / CapCut，匯入你的影片</li>
                  <li>輸出設定選 <span className="text-red-300 font-bold">720p、30fps、H.264</span></li>
                  <li>如果還太大，縮短片長到 30～60 秒</li>
                  <li>確認輸出檔案 &lt; 24MB 再上傳</li>
                </ol>
              </div>
              <p className="text-white/60">支援格式：mp3 / mp4 / m4a / wav / webm / mov</p>
            </StepCard>

            <StepCard num={4} title="填寫內容設定（選填但建議填）">
              <MockUI>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Arrow label="選你的行業" dir="right" />
                      <span className="text-white/50 text-xs">產業</span>
                    </div>
                    <div className="h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-between px-3 text-white/60 text-sm">
                      通用 <span>▾</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Arrow label="寫你的主題" dir="right" />
                      <span className="text-white/50 text-xs">主題（選填）</span>
                    </div>
                    <div className="h-10 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/40 text-sm">
                      例如：30歲存第一桶金方法
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Arrow label="填你的受眾" dir="right" />
                      <span className="text-white/50 text-xs">目標受眾（選填）</span>
                    </div>
                    <div className="h-10 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/40 text-sm">
                      例如：月薪3萬的上班族
                    </div>
                  </div>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={5} title="按下「開始爆款分析」" tip="每次分析消耗 1 次分析額度。免費方案共 3 次。">
              <MockUI>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 justify-center flex-wrap">
                    <Arrow label="先按這個分析" dir="right" />
                    <div className="px-6 py-3 rounded-lg bg-red-500 text-white font-bold text-sm">
                      開始爆款分析
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-center flex-wrap">
                    <span className="text-white/40 text-sm">分析完再按</span>
                    <span className="text-white/30">→</span>
                    <div className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold text-sm">
                      ✨ 生成腳本和標題
                    </div>
                  </div>
                </div>
              </MockUI>
              <p>按下後系統會：① 轉錄影片（把影片變文字）→ ② AI 分析爆款結構</p>
              <p>等 30 秒 ~ 2 分鐘（視影片長度），就會看到完整分析結果。</p>
            </StepCard>

            <StepCard num={6} title="看分析結果">
              <p>分析完成後你會看到：</p>
              <MockUI>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/40 text-xs mb-1">核心主題</div>
                    <div className="text-white text-sm font-bold">AI 幫你整理的主題</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/40 text-xs mb-1">Hook 類型</div>
                    <div className="text-white text-sm font-bold">錯誤揭露型 / 數字型...</div>
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-white/40 text-xs mb-1">開頭 Hook</div>
                  <div className="text-white text-sm">開場的那句吸引人的話</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-white/40 text-xs mb-1">分析摘要</div>
                  <div className="text-white/70 text-sm">AI 解釋這支影片為什麼紅</div>
                </div>
              </MockUI>
            </StepCard>
          </>
        )}

        {/* ===== 生成腳本 ===== */}
        {tab === "generate" && (
          <>
            <StepCard num={1} title="先完成「爆款分析」">
              <p>生成腳本的前提是：你要先有一支分析過的影片。</p>
              <p>如果還沒分析 → 先去 <span className="text-red-400 font-bold">「爆款分析」</span> tab 完成分析。</p>
            </StepCard>

            <StepCard num={2} title="填寫「套用到我的內容」設定">
              <MockUI>
                <div className="rounded-lg bg-green-900/20 border border-green-500/20 p-4 space-y-3">
                  <div className="text-green-400 font-bold text-sm">③ 套用到我的內容（選填）</div>
                  <div className="text-white/50 text-xs">分析完爆款公式後，AI 會把同樣的公式套用到你自己的主角。不填就直接複製原影片的邏輯。</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Arrow label="填你想拍的主題" dir="right" />
                    </div>
                    <div className="h-10 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/40 text-sm">
                      例如：換成我的行業、改成台灣在地案例
                    </div>
                  </div>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={3} title="按「生成腳本和標題」" tip="每次生成消耗 1 次生成額度。免費方案共 3 次。">
              <MockUI>
                <div className="flex items-center gap-3 justify-center flex-wrap">
                  <Arrow label="按這裡生成腳本" dir="right" />
                  <div className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold text-sm">
                    ✨ 生成腳本和標題
                  </div>
                </div>
              </MockUI>
              <p>等幾十秒，AI 就會生成：</p>
              <ul className="list-disc list-inside text-white/70 space-y-1">
                <li><span className="text-white font-bold">多個標題</span>（8～10 個不同版本）</li>
                <li><span className="text-white font-bold">多版腳本</span>（對話型、數字型、身份認同型等）</li>
                <li><span className="text-white font-bold">分鏡表</span>（部分行業會自動生成）</li>
              </ul>
            </StepCard>

            <StepCard num={4} title="查看生成結果">
              <MockUI>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold text-sm">已保存的生成內容</span>
                    <div className="flex items-center gap-2">
                      <Arrow label="一鍵複製" dir="right" />
                      <span className="px-3 py-1 rounded bg-green-600 text-white text-xs font-bold">一鍵複製全部標題</span>
                    </div>
                  </div>
                  <div className="text-white/50 text-xs">生成標題</div>
                  <div className="space-y-1.5 text-white/80 text-sm">
                    <div>1. 如果你還在對AI說請跟謝謝，那你真的會一輩子用不好AI</div>
                    <div>2. 對AI說禮貌話？準確率直接掉5%</div>
                    <div>3. AI根本不需要你客氣，它只需要你夠直接</div>
                  </div>
                </div>
              </MockUI>
              <MockUI>
                <div className="space-y-2">
                  <div className="text-center">
                    <Arrow label="展開看完整腳本" dir="down" />
                  </div>
                  <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-bold text-sm text-center">
                    ▶ 查看生成腳本（3 版）
                  </div>
                </div>
              </MockUI>
              <p>你可以挑最喜歡的標題和腳本，直接複製去拍片用！</p>
            </StepCard>
          </>
        )}

        {/* ===== IG Reels 攻略 ===== */}
        {tab === "ig" && (
          <>
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6">
              <h3 className="text-lg font-black text-white mb-2">為什麼 IG Reels 不能直接貼網址？</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Instagram 會主動封鎖自動下載，用網址抓影片非常不穩定。
                為了確保你每次分析都能成功，我們提供兩種更可靠的方式。
              </p>
            </div>

            <Divider label="方法一：上傳影片檔（最推薦）" />

            <StepCard num={1} title="從 IG 下載 Reels 影片">
              <p>打開 Instagram，找到你想分析的 Reels：</p>
              <MockUI>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">iOS（iPhone）：</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-white/70">
                    <li>點 Reels 右下角的 <span className="text-red-300 font-bold">「...」</span> 按鈕</li>
                    <li>選 <span className="text-red-300 font-bold">「儲存」</span> 到手機相簿</li>
                    <li>如果沒有儲存選項，用螢幕錄影也可以</li>
                  </ol>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-white font-bold">Android：</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-white/70">
                    <li>點 Reels 右下角的 <span className="text-red-300 font-bold">「...」</span> 按鈕</li>
                    <li>選 <span className="text-red-300 font-bold">「下載」</span></li>
                    <li>影片會存到你的相簿或下載資料夾</li>
                  </ol>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={2} title="上傳到 Hookvox 分析" tip="影片大小建議 24MB 以下。如果太大，用剪映壓縮到 720p。">
              <MockUI>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Arrow label="選這個" dir="right" />
                    <span className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold">
                      上傳音訊 / 影片
                    </span>
                  </div>
                  <div className="text-center">
                    <Arrow label="選擇剛才儲存的 IG 影片" dir="down" />
                  </div>
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center text-white/40 text-sm">
                    點擊上傳或拖拽檔案到這裡
                  </div>
                </div>
              </MockUI>
              <p>上傳後，填好行業和主題，按 <span className="text-red-400 font-bold">「開始爆款分析」</span> 就行了！</p>
            </StepCard>

            <Divider label="方法二：貼逐字稿（最快）" />

            <StepCard num={3} title="複製 IG Reels 的字幕/文字">
              <p>如果你只想快速分析文案和 Hook，不需要整支影片：</p>
              <MockUI>
                <div className="space-y-2 text-sm">
                  <ol className="list-decimal list-inside space-y-2 text-white/70">
                    <li>打開 IG Reels → 看影片的 <span className="text-red-300 font-bold">說明文字（Caption）</span></li>
                    <li>長按文字 → <span className="text-red-300 font-bold">複製</span></li>
                    <li>或者邊看影片邊手打出影片中說的話</li>
                  </ol>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={4} title="貼到 Hookvox 的逐字稿欄位">
              <MockUI>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Arrow label="選這個" dir="right" />
                    <span className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-bold">
                      貼逐字稿
                    </span>
                  </div>
                  <div className="text-center">
                    <Arrow label="把文字貼在這裡" dir="down" />
                  </div>
                  <div className="h-24 rounded-lg bg-white/10 border border-white/20 flex items-start p-3 text-white/40 text-sm">
                    貼上影片的逐字稿或文案內容...
                  </div>
                </div>
              </MockUI>
              <p>貼完後一樣按 <span className="text-red-400 font-bold">「開始爆款分析」</span>，AI 會分析文案結構！</p>
            </StepCard>

            <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6">
              <h3 className="text-green-400 font-bold mb-2">哪種方法比較好？</h3>
              <div className="space-y-2 text-sm text-white/70">
                <p><span className="text-white font-bold">上傳影片</span> — 分析最完整，AI 會聽到語氣、節奏、口語表達</p>
                <p><span className="text-white font-bold">貼逐字稿</span> — 最快速，幾秒鐘就能開始分析，適合文案型內容</p>
                <p className="text-green-300 pt-1">兩種方式都能生成完整的腳本和標題！</p>
              </div>
            </div>
          </>
        )}

        {/* ===== 實戰技巧 ===== */}
        {tab === "tips" && (
          <>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <h3 className="text-lg font-black text-white mb-2">用 Hookvox 拍出爆款的秘訣</h3>
              <p className="text-white/70 text-sm">
                工具只是輔助，怎麼用才是關鍵。這些技巧讓你的效率翻倍。
              </p>
            </div>

            <Divider label="選片技巧" />

            <StepCard num={1} title="挑對的影片來分析">
              <p>不是隨便一支影片都適合分析。選片標準：</p>
              <div className="space-y-2">
                <div className="rounded-xl bg-green-900/20 border border-green-500/20 p-4">
                  <div className="text-green-400 font-bold text-sm mb-2">要分析的影片</div>
                  <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                    <li>跟你<span className="text-white font-bold">同行業</span>的爆款（觀看數明顯高於平均）</li>
                    <li>有<span className="text-white font-bold">口說內容</span>的影片（不是純音樂或舞蹈）</li>
                    <li><span className="text-white font-bold">30 秒 ~ 3 分鐘</span>的影片（太短分析不出結構）</li>
                    <li>最近 <span className="text-white font-bold">1~3 個月</span>內發的（趨勢還在）</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-red-900/20 border border-red-500/20 p-4">
                  <div className="text-red-400 font-bold text-sm mb-2">不建議分析的影片</div>
                  <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                    <li>純跳舞/音樂/迷因影片（沒有腳本結構）</li>
                    <li>紅人靠臉就紅的影片（跟內容公式無關）</li>
                    <li>超過 5 分鐘的長影片（短影音公式不適用）</li>
                  </ul>
                </div>
              </div>
            </StepCard>

            <Divider label="分析 → 生成最佳流程" />

            <StepCard num={2} title="黃金工作流程">
              <p>每天花 <span className="text-white font-bold">15 分鐘</span>，產出一週的內容：</p>
              <MockUI>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <div>
                      <div className="text-white font-bold text-sm">滑 IG / YT Shorts 找 3 支同行爆款</div>
                      <div className="text-white/50 text-xs">花 5 分鐘，找觀看數特別高的影片</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500 text-white font-bold text-xs flex items-center justify-center">2</span>
                    <div>
                      <div className="text-white font-bold text-sm">全部丟進 Hookvox 分析</div>
                      <div className="text-white/50 text-xs">上傳影片或貼逐字稿，3 支一起分析</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">3</span>
                    <div>
                      <div className="text-white font-bold text-sm">每支生成腳本 + 用爆款延伸變 3 個角度</div>
                      <div className="text-white/50 text-xs">3 支影片 × 3 個角度 = 9 個腳本靈感</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">4</span>
                    <div>
                      <div className="text-white font-bold text-sm">挑最好的 5~7 個去拍</div>
                      <div className="text-white/50 text-xs">一週的內容就有了，每天一支</div>
                    </div>
                  </div>
                </div>
              </MockUI>
            </StepCard>

            <Divider label="進階技巧" />

            <StepCard num={3} title="善用「套用到我的內容」">
              <p>生成腳本時，<span className="text-white font-bold">「套用到我的內容」</span>欄位是你的秘密武器：</p>
              <MockUI>
                <div className="space-y-3">
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/50 text-xs mb-1">寫得好的範例</div>
                    <div className="text-green-300 text-sm">「我是賣手工皂的，目標客群是 25-35 歲注重天然保養的女生，我的特色是用台灣在地植物萃取」</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/50 text-xs mb-1">寫得不好的範例</div>
                    <div className="text-red-300 text-sm">「改成我的行業」</div>
                  </div>
                </div>
              </MockUI>
              <p className="text-white/60">寫越具體，AI 生成的腳本越貼近你的真實情況。</p>
            </StepCard>

            <StepCard num={4} title="分析完不要只看結果，要看「為什麼紅」">
              <p>很多人分析完只看生成的腳本就跑了。但最有價值的是 <span className="text-white font-bold">分析摘要</span>：</p>
              <ul className="list-disc list-inside text-white/70 space-y-1">
                <li><span className="text-white font-bold">Hook 類型</span> — 學會這個類型，你可以自己套用到其他主題</li>
                <li><span className="text-white font-bold">情緒拉力</span> — 了解這支影片觸發了觀眾什麼情緒</li>
                <li><span className="text-white font-bold">結構拆解</span> — 看懂「開頭 → 中段 → 結尾」的節奏</li>
              </ul>
              <p className="text-amber-300 pt-2">看懂公式比複製腳本更重要。公式可以用一輩子，腳本只能用一次。</p>
            </StepCard>

            <StepCard num={5} title="用爆款資料庫累積你的靈感庫">
              <p>每次分析的影片都會存在爆款資料庫裡。善用它：</p>
              <ul className="list-disc list-inside text-white/70 space-y-1">
                <li>把效果好的分析結果加入 <span className="text-red-400 font-bold">靈感簿</span></li>
                <li>定期回來翻舊的分析，找到 <span className="text-white font-bold">你行業最有效的 Hook 模式</span></li>
                <li>累積 20+ 支分析後，你會明顯感覺到 <span className="text-white font-bold">對爆款結構的直覺變強了</span></li>
              </ul>
            </StepCard>

            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
              <h3 className="text-red-400 font-bold mb-2">Hookvox vs 直接用 ChatGPT 的差別</h3>
              <div className="space-y-2 text-sm text-white/70">
                <p><span className="text-white font-bold">ChatGPT</span> — 你要自己寫 prompt、自己拆解影片結構、每次對話從零開始、沒有歷史資料</p>
                <p><span className="text-white font-bold">Hookvox</span> — 貼連結就出結果、專業的爆款分析框架、所有分析自動建檔、越用資料庫越強</p>
                <p className="text-red-300 pt-1">就像你可以用 Excel 記帳，但大部分人選擇用記帳 App。專門的工具永遠比通用工具更快、更準。</p>
              </div>
            </div>
          </>
        )}

        {/* ===== 爆款資料庫 ===== */}
        {tab === "database" && (
          <>
            <StepCard num={1} title="進入爆款資料庫">
              <p>點上方導覽列的 <span className="text-red-400 font-bold">「爆款資料庫」</span>。</p>
              <p>所有你分析過的影片都會自動出現在這裡。</p>
            </StepCard>

            <StepCard num={2} title="搜尋與篩選">
              <MockUI>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/40 text-sm">
                      搜尋主題、Hook、痛點、標題...
                    </div>
                    <Arrow label="輸入關鍵字" dir="left" />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <span className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold">全部影片</span>
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-red-300 text-xs">↑ 所有分析過的</span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm">靈感簿</span>
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-red-300 text-xs">↑ 你收藏的</span>
                      </div>
                    </div>
                  </div>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={3} title="使用每支影片的功能">
              <MockUI>
                <div className="space-y-3 text-sm">
                  <div className="text-white/50">分析時間：2026/3/20 下午12:37:29</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Arrow label="" dir="right" />
                      <span className="text-red-400 text-xs underline">原影片連結 →</span>
                      <span className="text-white/40 text-xs">— 回去看原影片</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Arrow label="" dir="right" />
                      <span className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs">匯出 .txt</span>
                      <span className="text-white/40 text-xs">— 下載完整文字檔（Pro 以上）</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Arrow label="" dir="right" />
                      <span className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs">加入靈感簿</span>
                      <span className="text-white/40 text-xs">— 收藏方便之後找</span>
                    </div>
                  </div>
                </div>
              </MockUI>
              <ul className="list-disc list-inside text-white/70 space-y-1">
                <li><span className="text-white font-bold">原影片連結</span> — 回去看原本的影片</li>
                <li><span className="text-white font-bold">匯出 .txt</span> — 下載完整分析+腳本的文字檔（Pro 以上）</li>
                <li><span className="text-white font-bold">加入靈感簿</span> — 收藏起來方便之後找</li>
                <li><span className="text-white font-bold">一鍵複製全部標題</span> — 複製所有生成標題到剪貼簿（Pro 以上）</li>
              </ul>
            </StepCard>
          </>
        )}

        {/* ===== 爆款延伸 ===== */}
        {tab === "extend" && (
          <>
            <StepCard num={1} title="什麼是「爆款延伸」？">
              <p>同一支爆款影片，AI 幫你想出 <span className="text-white font-bold">3 個不同切入角度</span>。</p>
              <p>例如同一個主題，可以變成「省錢版」「懶人版」「專業版」三支不同的片。</p>
            </StepCard>

            <StepCard num={2} title="生成延伸角度">
              <p>在爆款資料庫的每支影片卡片裡，往下滑找到 <span className="text-red-400 font-bold">「爆款延伸」</span> 區塊：</p>
              <MockUI>
                <div className="space-y-3">
                  <div className="text-red-400 font-bold text-sm">爆款延伸</div>
                  <div className="text-white/50 text-xs">先生成 3 個延伸角度與 Hook，再選擇要不要生成完整腳本</div>
                  <div className="text-center space-y-2">
                    <Arrow label="按這裡生成 3 個角度" dir="down" />
                    <div className="inline-block px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm">
                      生成 3 個爆款延伸
                    </div>
                  </div>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={3} title="從角度生成完整腳本" tip="免費方案無法用延伸腳本。Creator 每支影片 1 個，Pro/旗艦每支 3 個。">
              <p>生成角度後，每個角度下面會有一個按鈕：</p>
              <MockUI>
                <div className="space-y-2">
                  <div className="text-white font-bold text-sm">角度 1：省錢版切入</div>
                  <div className="text-white/60 text-sm">Hook：「你每天花的這筆錢，其實可以省下來...」</div>
                  <div className="text-center">
                    <Arrow label="從這個角度生成完整腳本" dir="down" />
                  </div>
                  <div className="inline-block px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm">
                    生成延伸腳本
                  </div>
                </div>
              </MockUI>
            </StepCard>
          </>
        )}

        {/* ===== 方案 / 帳單 ===== */}
        {tab === "plans" && (
          <>
            <StepCard num={1} title="查看方案差異">
              <p>點導覽列的 <span className="text-red-400 font-bold">「方案」</span>，可以看到所有方案的功能比較：</p>
              <MockUI>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center">
                    <thead>
                      <tr className="text-white/50">
                        <td className="p-2 text-left">項目</td>
                        <td className="p-2">免費</td>
                        <td className="p-2 text-red-300">Creator</td>
                        <td className="p-2">專業版</td>
                        <td className="p-2">旗艦版</td>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      <tr className="border-t border-white/5">
                        <td className="p-2 text-left">分析+生成/週期</td>
                        <td className="p-2">3+3</td>
                        <td className="p-2">50+50</td>
                        <td className="p-2">200+200</td>
                        <td className="p-2">500+500</td>
                      </tr>
                      <tr className="border-t border-white/5">
                        <td className="p-2 text-left">延伸腳本數</td>
                        <td className="p-2">0</td>
                        <td className="p-2">1</td>
                        <td className="p-2">3</td>
                        <td className="p-2">3</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </MockUI>
            </StepCard>

            <StepCard num={2} title="升級方案">
              <MockUI>
                <div className="flex gap-2 justify-center flex-wrap">
                  <span className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold">月繳</span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs">季繳 <span className="text-green-400">省10%</span></span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs">半年繳 <span className="text-green-400">省15%</span></span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs">年繳 <span className="text-green-400">省20%</span></span>
                </div>
                <div className="text-center pt-2">
                  <Arrow label="選好週期後，在想要的方案按「升級」" dir="down" />
                </div>
              </MockUI>
              <p>系統會引導你到藍新金流付款頁面。付完款後方案立即生效。</p>
              <p className="text-white/60">升級差額計算：目標方案原價 - 目前已付款金額 = 你要補的差額</p>
            </StepCard>

            <StepCard num={3} title="查看帳單">
              <p>點導覽列的 <span className="text-red-400 font-bold">「帳單」</span>：</p>
              <MockUI>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-white/50 text-xs">目前方案</div>
                      <div className="text-white font-bold">專業版方案</div>
                      <div className="text-white/40 text-xs">NT$1,599 / 月</div>
                    </div>
                    <Arrow label="目前訂閱狀態" dir="left" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="text-white/40 text-xs">爆款分析</div>
                      <Arrow label="已用/總量" dir="right" />
                      <div className="text-white font-bold">2 / 200</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="text-white/40 text-xs">內容生成</div>
                      <div className="text-white font-bold">1 / 200</div>
                    </div>
                  </div>
                </div>
              </MockUI>
              <p>往下還有 <span className="text-white font-bold">付款記錄</span>，可以看到每筆付款的金額和狀態。</p>
            </StepCard>
          </>
        )}

        {/* ===== 設定 ===== */}
        {tab === "settings" && (
          <>
            <StepCard num={1} title="進入個人設定">
              <p>點導覽列的 <span className="text-red-400 font-bold">「設定」</span>。</p>
            </StepCard>

            <StepCard num={2} title="修改你的資料">
              <MockUI>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-white/50 text-xs mb-1">Email</div>
                      <div className="h-9 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/50 text-sm">
                        你的@email.com
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Arrow label="可以改" dir="right" />
                        <span className="text-white/50 text-xs">名稱</span>
                      </div>
                      <div className="h-9 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/70 text-sm">
                        你的名稱
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Arrow label="可以改" dir="right" />
                      <span className="text-white/50 text-xs">Instagram 帳號</span>
                    </div>
                    <div className="h-9 rounded-lg bg-white/10 border border-white/20 flex items-center px-3 text-white/70 text-sm">
                      @ 你的IG帳號
                    </div>
                  </div>
                  <div className="text-center">
                    <Arrow label="改完按這裡儲存" dir="down" />
                  </div>
                  <div className="inline-block px-5 py-2 rounded-lg bg-red-500 text-white font-bold text-sm">
                    儲存設定
                  </div>
                </div>
              </MockUI>
              <p className="text-white/60">Email 目前無法自行修改（綁定帳號用），其他欄位可以自由更改。</p>
            </StepCard>
          </>
        )}

        {/* ─── 底部 CTA ─── */}
        <div className="pt-8 border-t border-white/10">
          <div className="text-center space-y-4">
            <p className="text-white/50">看完了？開始試試看吧！</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/register"
                className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition"
              >
                免費試用 3 次
              </Link>
              <Link
                href="/analyze"
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition"
              >
                前往爆款分析
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/10 py-6 mt-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <span>© 2026 Hookvox — by 金孫</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white/60 transition">服務條款</Link>
            <Link href="/privacy" className="hover:text-white/60 transition">隱私權政策</Link>
            <Link href="/refund" className="hover:text-white/60 transition">退款政策</Link>
            <Link href="/contact" className="hover:text-white/60 transition">聯繫我們</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
