import Link from "next/link";

const cases = [
  {
    industry: "美業 · 紋繡師",
    name: "從平均 1000 觀看到 2 萬，我只做對一件事",
    beforeNum: "1,000",
    beforeLabel: "觀看",
    afterNum: "20,000",
    afterLabel: "單支觀看",
    growth: "20x",
    before: "發了很多技術教學，認真拍、認真剪，平均觀看卡在 1000 左右。不知道問題在哪。",
    after: "用 Hookvox 拆了一支同領域爆款，發現開頭 3 秒才是關鍵。照著公式改了一支「紋繡師不會告訴你的 3 件事」，第一次衝到 2 萬。",
    quote: "以前自己猜觀眾愛看什麼，現在直接學已經爆的結構，再換成我的案例。省下的試錯時間，至少半年。",
    avatar: "👩‍💼",
    role: "紋繡工作室負責人",
  },
  {
    industry: "保險 · 業務",
    name: "講保險沒人看完？換個開頭，私訊直接多 3 倍",
    beforeNum: "500",
    beforeLabel: "觀看",
    afterNum: "52 萬+",
    afterLabel: "觀看 + 私訊暴增",
    growth: "1000x+",
    before: "講保險容易太硬，完播率一直拉不起來，再專業也沒人看到最後。",
    after: "用「數字 + 反轉」型標題跟 AI 生成的前 3 秒 Hook，同樣內容換個開場，幾支從幾百衝到 50 萬以上，私訊詢問明顯變多。",
    quote: "爆款公式不是抄襲，是學怎麼開場、怎麼留人。內容還是自己的專業，只是終於有人願意看完了。",
    avatar: "👨‍💻",
    role: "保險從業 6 年",
  },
  {
    industry: "食譜 · 料理創作者",
    name: "同一道菜，換一個開頭：從沒人看到 38 萬",
    beforeNum: "~0",
    beforeLabel: "自然流量",
    afterNum: "38 萬",
    afterLabel: "單支觀看",
    growth: "∞",
    before: "食譜影片一堆，不知道怎麼做出差異，發了等於沒發。",
    after: "用 Hookvox 分析美食類爆款，發現「爭議開頭 + 結尾翻轉」超有效。同一道菜改腳本，一支衝到 38 萬。",
    quote: "同一道菜，換一個開頭跟說故事方式，流量差太多。這工具幫我少走至少一年彎路。",
    avatar: "👩‍🍳",
    role: "居家料理創作者",
  },
  {
    industry: "健身 · 教練",
    name: "乾講知識沒人看？用爆款結構從 500 衝到 1.8 萬",
    beforeNum: "500",
    beforeLabel: "觀看",
    afterNum: "1.8 萬+",
    afterLabel: "觀看",
    growth: "36x",
    before: "乾講減脂、重訓，完播率低，不知道開場要怎麼吸睛。",
    after: "用 Hookvox 看平台上爆款開頭跟節奏，生成多版腳本選最順的拍，幾支從 500 成長到 1.8 萬以上。",
    quote: "不是瞎學，是知道哪一種開場、哪一種節奏真的有用，再套自己的專業。",
    avatar: "💪",
    role: "私人教練",
  },
];

const stats = [
  { value: "60x", label: "最高單支成長倍數" },
  { value: "4", label: "大類產業實證" },
  { value: "3 分鐘", label: "從爆款到你的腳本" },
];

export default function SuccessCasesPage() {
  return (
    <div className="min-h-screen bg-dark-900 overflow-hidden">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-dark-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-black text-sm">
              H
            </div>
            <span className="font-bold text-lg">Hookvox</span>
          </Link>
          <div className="hidden md:flex items-center gap-5">
            <Link href="/guide" className="text-sm text-white/60 hover:text-white transition-colors">
              功能教學
            </Link>
            <Link href="/plans" className="text-sm text-white/60 hover:text-white transition-colors">
              方案
            </Link>
            <Link href="/register" className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              免費試用
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero - 不買不行的開場 */}
      <section className="pt-28 pb-16 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-0 w-[400px] h-[300px] bg-amber-500/10 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm px-4 py-2 rounded-full mb-6">
            🔥 別人已經在用了，你還在猜觀眾愛看什麼？
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            他們用 Hookvox
            <br />
            <span className="gradient-text">把流量做起來了</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            不是理論，是實戰。同一個工具、同一套流程：分析爆款 → 套用公式 → 生成腳本。結果擺在這裡。
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-brand-400">{s.value}</div>
                <div className="text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
          <Link
            href="/register"
            className="inline-block bg-brand-500 hover:bg-brand-400 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,61,48,0.35)]"
          >
            免費試用 3 次，自己驗證 →
          </Link>
        </div>
      </section>

      {/* 案例卡片 - 數字大、對比強 */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-2 text-white">
            真實案例 · 真實數字
          </h2>
          <p className="text-white/50 text-center mb-12 text-sm">
            以下為使用 Hookvox 流程後的成效，依創作者自身經營與內容而異
          </p>
          <div className="space-y-12">
            {cases.map((c, i) => (
              <article
                key={i}
                className="relative glass rounded-2xl p-8 md:p-10 space-y-6 border border-white/10 hover:border-brand-500/30 transition-all overflow-hidden"
              >
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-sm font-bold">
                  成長 {c.growth}
                </div>
                <div className="text-sm font-bold text-brand-400">{c.industry}</div>
                <h2 className="text-2xl md:text-3xl font-black text-white pr-24">
                  {c.name}
                </h2>

                {/* 前後數字對比 - 視覺衝擊 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-red-500/10 border-2 border-red-500/30 p-5 text-center">
                    <div className="text-3xl font-black text-red-400">{c.beforeNum}</div>
                    <div className="text-xs font-bold text-red-300/80 mt-1">{c.beforeLabel}</div>
                    <div className="text-white/50 text-xs mt-2">之前</div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 p-5 text-center">
                    <div className="text-3xl font-black text-emerald-400">{c.afterNum}</div>
                    <div className="text-xs font-bold text-emerald-300/80 mt-1">{c.afterLabel}</div>
                    <div className="text-white/50 text-xs mt-2">之後</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <div className="text-red-300/80 font-bold mb-1">❌ 之前的困境</div>
                    <p className="text-white/70 leading-relaxed">{c.before}</p>
                  </div>
                  <div>
                    <div className="text-emerald-300/80 font-bold mb-1">✅ 之後怎麼做</div>
                    <p className="text-white/70 leading-relaxed">{c.after}</p>
                  </div>
                </div>

                <blockquote className="rounded-xl bg-white/5 border-l-4 border-brand-500 pl-6 pr-4 py-4">
                  <p className="text-white/90 italic leading-relaxed">「{c.quote}」</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-2xl">{c.avatar}</span>
                    <span className="text-white/50 text-sm">{c.role}</span>
                  </div>
                </blockquote>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 收尾 - 緊迫感 + CTA */}
      <section className="py-20 px-6 bg-gradient-to-b from-dark-900 via-brand-500/5 to-dark-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">
            你的同業可能已經在用了
          </h2>
          <p className="text-white/60 mb-8 leading-relaxed">
            爆款不會等你。別人花三個月摸索的公式，Hookvox 三分鐘幫你拆好、套好、生成好。免費試用 3 次，不滿意不用付錢。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,61,48,0.4)]"
            >
              馬上免費試用 3 次
            </Link>
            <Link
              href="/guide"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/20 text-white px-8 py-4 rounded-xl font-medium transition-colors"
            >
              先看怎麼操作
            </Link>
          </div>
          <p className="text-white/40 text-sm mt-6">
            不需信用卡 · 註冊即送 3 次分析 + 3 次生成
          </p>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center text-white font-black text-xs">
              H
            </div>
            <span className="font-bold">Hookvox</span>
          </Link>
          <div className="flex flex-wrap gap-6 text-sm text-white/40">
            <Link href="/" className="hover:text-white transition-colors">首頁</Link>
            <Link href="/guide" className="hover:text-white transition-colors">功能教學</Link>
            <Link href="/plans" className="hover:text-white transition-colors">方案</Link>
            <Link href="/terms" className="hover:text-white transition-colors">服務條款</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">隱私權政策</Link>
            <Link href="/refund" className="hover:text-white transition-colors">退款政策</Link>
            <Link href="/contact" className="hover:text-white transition-colors">聯繫我們</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
