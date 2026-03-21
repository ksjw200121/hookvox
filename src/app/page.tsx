import Link from "next/link";
import { Reveal } from "@/components/Reveal";

/* ---------- Types ---------- */
type PricingCard = {
  name: string;
  price: string;
  period: string;
  tag: string;
  features: string[];
  cta: string;
  highlight: boolean;
  earlybird?: boolean;
  originalPrice?: string;
};

const pricingCards: PricingCard[] = [
  {
    name: "免費試用",
    price: "NT$0",
    period: "",
    tag: "",
    features: [
      "3 次分析 + 3 次生成",
      "完整功能試用",
      "腳本 + 標題 + 分鏡",
      "不需信用卡",
    ],
    cta: "免費開始",
    highlight: false,
  },
  {
    name: "Creator",
    price: "NT$699",
    period: "/月",
    tag: "最多人選",
    features: [
      "50 次分析 + 50 次生成 / 週期",
      "腳本 + 標題 + 分鏡",
      "爆款資料庫",
      "每支影片可生成 1 個延伸腳本",
    ],
    cta: "立即升級",
    highlight: true,
  },
  {
    name: "專業版",
    price: "NT$1,599",
    period: "/月",
    tag: "重度使用者",
    features: [
      "200 次分析 + 200 次生成 / 週期",
      "腳本 + 標題 + 分鏡",
      "爆款資料庫",
      "每支影片可生成 3 個延伸腳本、一鍵複製標題",
    ],
    cta: "升級專業版",
    highlight: false,
  },
];

/* ---------- Page (Server Component for SEO) ---------- */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900 overflow-hidden">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-dark-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-black text-sm">
              H
            </div>
            <span className="font-bold text-lg">Hookvox</span>
          </div>

          <div className="hidden md:flex items-center gap-5">
            <Link href="/success-cases" className="text-sm text-white/60 hover:text-white transition-colors">成功案例</Link>
            <Link href="/guide" className="text-sm text-white/60 hover:text-white transition-colors">功能教學</Link>
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">控制台預覽</Link>
            <Link href="/plans" className="text-sm text-white/60 hover:text-white transition-colors">方案</Link>
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">登入</Link>
            <Link href="/register" className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">免費試用</Link>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">登入</Link>
            <Link href="/register" className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">註冊</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

        <Reveal className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            專為台灣創作者打造的爆款腳本 AI
          </div>

          <h1 className="text-6xl md:text-7xl font-black leading-tight mb-6">
            分析爆款公式
            <br />
            <span className="gradient-text">套用到你的內容</span>
          </h1>

          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            貼上爆款影片網址，AI 拆解它的 Hook、情緒、公式，
            再幫你把同樣的邏輯套用到你自己的主角，生成腳本、標題、分鏡。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,61,48,0.4)]"
            >
              免費試用 3 次 →
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-medium text-lg transition-colors"
            >
              先看功能頁
            </Link>
            <Link
              href="/plans"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-medium text-lg transition-colors"
            >
              查看方案價格
            </Link>
          </div>

          <p className="text-sm text-white/30 mt-4">
            現在可先瀏覽功能頁面，真正使用時再註冊即可
          </p>
        </Reveal>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">不是生成腳本，是複製爆款邏輯</h2>
            <p className="text-white/40">別人花三個月摸索的公式，Hookvox 幫你三分鐘拆解完</p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🔍", title: "爆款公式拆解", desc: "貼上 IG Reels、TikTok、YouTube Shorts 網址，AI 拆解 Hook 類型、情緒觸發點、爆紅原因" },
              { icon: "🔄", title: "套用到你的主角", desc: "原影片是雞胸肉？你可以換成牛排。保留爆款結構，換掉所有具體內容，腳本變你自己的" },
              { icon: "✍️", title: "3 種版本腳本", desc: "對話演戲型、數字衝擊型、身份認同型，三個版本一次給你，選最適合的用" },
              { icon: "📋", title: "分鏡表自動生成", desc: "食譜、美業、探店、旅遊、化妝這五個行業，腳本生成後自動附上拍攝分鏡，按順序拍就好" },
              { icon: "💥", title: "8 個爆款標題", desc: "同時生成 20 個高點擊率標題，有讓人不舒服的、有意外轉折的、有具體數字的" },
              { icon: "📊", title: "爆款資料庫", desc: "每次分析都自動儲存，建立你自己的爆款素材庫，下次創作直接翻出來參考" },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="glass rounded-2xl p-6 hover:border-white/15 transition-colors group h-full">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-brand-400 transition-colors">{f.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 px-6 bg-dark-800/50">
        <Reveal className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">誰適合用 Hookvox？</h2>
          <p className="text-white/40 mb-12">只要你在台灣做短影音，Hookvox 都幫你少走彎路</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "保險業務", "房仲", "美業", "健身教練", "食譜創作者", "旅遊創作者",
              "探店部落客", "化妝教學", "顧問", "直銷", "自媒體創作者", "品牌行銷",
            ].map((u, i) => (
              <Reveal key={u} delay={i * 50} className="inline-block">
                <span className="bg-dark-700 border border-white/10 text-white/70 px-5 py-2.5 rounded-full text-sm font-medium hover:border-brand-500/40 hover:text-white transition-colors cursor-default inline-block">
                  {u}
                </span>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Steps */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="text-4xl font-black mb-4">三步驟，從爆款到你的腳本</h2>
            <p className="text-white/40 mb-16">最快 3 分鐘</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "貼上爆款影片", desc: "貼上任何你覺得很紅的 IG、TikTok、YouTube 影片網址" },
              { step: "02", title: "填入你的資訊", desc: "選行業、填主題、告訴 AI 你要把爆款套用到什麼主角上" },
              { step: "03", title: "拿走腳本和分鏡", desc: "3 種腳本版本 + 8 個標題 + 分鏡表，直接去拍" },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 150}>
                <div className="glass rounded-2xl p-8 h-full">
                  <div className="text-5xl font-black text-brand-500/30 mb-4">{s.step}</div>
                  <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-dark-800/50">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <h2 className="text-4xl font-black mb-2">簡單透明的定價</h2>
            <p className="text-white/40 mb-12">月繳、季繳、半年、年繳都有，詳細方案請至方案頁</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingCards.map((p, i) => (
              <Reveal key={p.name} delay={i * 120}>
                <div
                  className={`rounded-2xl p-8 relative h-full ${
                    p.highlight ? "bg-brand-500 ring-2 ring-brand-400" : "glass"
                  }`}
                >
                  {p.tag && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${
                        p.highlight ? "bg-white text-brand-600" : "bg-brand-500 text-white"
                      }`}
                    >
                      {p.tag}
                    </div>
                  )}
                  <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                  <div className="my-4">
                    {p.earlybird && (
                      <div className="text-xs line-through text-white/40 mb-1">{p.originalPrice}/月</div>
                    )}
                    <div className="flex items-end gap-1 justify-center">
                      <span className="text-4xl font-black">{p.price}</span>
                      <span className={`text-sm pb-1 ${p.highlight ? "text-white/70" : "text-white/40"}`}>{p.period}</span>
                    </div>
                    {p.earlybird && <div className="text-xs text-yellow-400 mt-1">早鳥限時優惠</div>}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className={`text-sm flex items-center gap-2 ${p.highlight ? "text-white/90" : "text-white/60"}`}>
                        <span className="text-green-400">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block w-full py-3 rounded-xl font-bold text-center transition-colors ${
                      p.highlight
                        ? "bg-white text-brand-600 hover:bg-white/90"
                        : "bg-white/10 hover:bg-white/15 text-white"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="text-white/30 text-xs mt-8">
            本服務為數位內容，付款後即可使用。依消費者保護法第19條，數位內容一經提供不適用鑑賞期退款。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center text-white font-black text-xs">H</div>
            <span className="font-bold">Hookvox</span>
          </div>
          <p className="text-white/30 text-sm">© 2026 Hookvox — by 金孫 · 台灣製造 🇹🇼</p>
          <div className="flex flex-wrap gap-6 text-sm text-white/40">
            <Link href="/success-cases" className="hover:text-white transition-colors">成功案例</Link>
            <Link href="/guide" className="hover:text-white transition-colors">功能教學</Link>
            <Link href="/plans" className="hover:text-white transition-colors">方案</Link>
            <Link href="/terms" className="hover:text-white transition-colors">服務條款</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">隱私權政策</Link>
            <Link href="/refund" className="hover:text-white transition-colors">退款政策</Link>
            <a href="mailto:ksjw200121@gmail.com?subject=訂閱電子報" className="hover:text-white transition-colors">訂閱電子報</a>
            <Link href="/contact" className="hover:text-white transition-colors">聯繫我們</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
