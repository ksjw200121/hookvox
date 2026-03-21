import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { FAQ } from "@/components/FAQ";

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

/* ---------- FAQ Data ---------- */
const faqItems = [
  { q: "免費試用需要信用卡嗎？", a: "完全不需要！註冊後立即獲得 3 次分析 + 3 次生成額度，不用綁定任何付款方式。" },
  { q: "支援哪些平台的影片？", a: "目前支援 Instagram Reels、TikTok、YouTube Shorts。你也可以直接上傳手機錄的影片檔案（.mp4、.mov）。" },
  { q: "生成的腳本可以商用嗎？", a: "可以！所有透過 Hookvox 生成的腳本、標題、分鏡內容，你都擁有完整的使用權，商用、個人使用都沒問題。" },
  { q: "可以隨時取消訂閱嗎？", a: "可以，隨時到設定頁面取消訂閱，取消後在當期結束前仍可繼續使用。不會有任何額外收費。" },
  { q: "手機可以用嗎？", a: "可以！Hookvox 完全支援手機瀏覽器操作，隨時隨地都能分析爆款、生成腳本。" },
  { q: "多久可以拿到腳本？", a: "從貼上網址到拿到完整腳本 + 標題 + 分鏡，最快 3 分鐘內完成。" },
];

/* ---------- Testimonials Data ---------- */
const testimonials = [
  {
    name: "小美",
    industry: "美業經營者",
    avatar: "M",
    quote: "以前寫一支腳本要花半天，現在 3 分鐘就搞定，而且拍出來的觀看數是以前的 10 倍！",
    stat: "觀看數成長 10x",
  },
  {
    name: "阿凱",
    industry: "健身教練",
    avatar: "K",
    quote: "我不擅長寫文案，但 Hookvox 幫我拆解爆款的邏輯，照著結構拍就對了，粉絲從 2000 漲到 1.2 萬。",
    stat: "粉絲成長 6x",
  },
  {
    name: "Emily",
    industry: "食譜創作者",
    avatar: "E",
    quote: "分鏡表超實用！以前拍片不知道怎麼切畫面，現在照著分鏡表一步步拍，效率高很多。",
    stat: "產出效率提升 5x",
  },
  {
    name: "Jason",
    industry: "房仲業務",
    avatar: "J",
    quote: "我用 Hookvox 分析同行的爆款再套用到我的物件，第一支影片就破萬觀看，直接帶來 3 組客戶。",
    stat: "單支影片破萬觀看",
  },
];

/* ---------- Show demo video? (set NEXT_PUBLIC_DEMO_VIDEO_URL env to enable) ---------- */
const demoVideoUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || "";

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

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-sm text-white/50">
            <span className="flex items-center gap-1.5"><span className="text-green-400">✓</span> 免費試用 3 次</span>
            <span className="flex items-center gap-1.5"><span className="text-green-400">✓</span> 不需信用卡</span>
            <span className="flex items-center gap-1.5"><span className="text-green-400">✓</span> 台灣團隊開發</span>
            <span className="flex items-center gap-1.5"><span className="text-green-400">✓</span> 資料安全加密</span>
          </div>
        </Reveal>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-white/5">
        <Reveal className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-black text-brand-400">3 分鐘</div>
              <div className="text-white/40 text-sm mt-1">從爆款到你的腳本</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-black text-brand-400">3 種</div>
              <div className="text-white/40 text-sm mt-1">不同風格腳本一次給</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-black text-brand-400">8 個</div>
              <div className="text-white/40 text-sm mt-1">爆款標題同時生成</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Demo Video (hidden until NEXT_PUBLIC_DEMO_VIDEO_URL is set) */}
      {demoVideoUrl && (
        <section className="py-20 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent pointer-events-none" />
          <Reveal className="max-w-4xl mx-auto text-center relative">
            <h2 className="text-3xl font-black mb-2">30 秒看懂 Hookvox</h2>
            <p className="text-white/40 mb-8">看完你就知道為什麼創作者都在用</p>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-dark-800">
              <iframe
                src={demoVideoUrl}
                title="Hookvox 產品介紹"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </Reveal>
        </section>
      )}

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

      {/* Before / After */}
      <section className="py-20 px-6 bg-dark-800/50">
        <Reveal className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">使用前 vs 使用後</h2>
          <p className="text-white/40 mb-12">同樣的創作者，不同的結果</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <Reveal delay={0}>
              <div className="rounded-2xl p-8 border-2 border-red-500/30 bg-red-500/5 h-full">
                <div className="text-red-400 font-bold text-lg mb-6 flex items-center justify-center gap-2">
                  <span className="text-2xl">😩</span> 使用前
                </div>
                <ul className="space-y-4 text-left">
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span>花 3 小時寫腳本，拍出來只有 200 觀看</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span>看到別人爆紅，不知道為什麼紅</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span>每次開頭都不知道怎麼 Hook 觀眾</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span>拍片不知道怎麼切畫面和分鏡</span>
                  </li>
                </ul>
              </div>
            </Reveal>

            {/* After */}
            <Reveal delay={150}>
              <div className="rounded-2xl p-8 border-2 border-green-500/30 bg-green-500/5 h-full">
                <div className="text-green-400 font-bold text-lg mb-6 flex items-center justify-center gap-2">
                  <span className="text-2xl">🚀</span> 使用後
                </div>
                <ul className="space-y-4 text-left">
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>3 分鐘套用爆款公式，同樣主題 2 萬觀看</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>AI 幫你拆解每支爆款的 Hook、情緒、結構</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>三種風格開頭任你選，每個都經過驗證</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>自動生成分鏡表，照順序拍就好</span>
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </section>

      {/* Target Audience */}
      <section className="py-20 px-6">
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

      {/* Testimonials */}
      <section className="py-20 px-6 bg-dark-800/50">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">創作者怎麼說</h2>
            <p className="text-white/40">來自不同行業的真實回饋</p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="glass rounded-2xl p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-white/40 text-xs">{t.industry}</div>
                    </div>
                    <div className="ml-auto bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                      {t.stat}
                    </div>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
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

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">常見問題</h2>
            <p className="text-white/40">有任何疑問？這裡可能有你的答案</p>
          </Reveal>
          <Reveal delay={100}>
            <FAQ items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-dark-800/50 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-brand-500/5 via-transparent to-transparent pointer-events-none" />
        <Reveal className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-4xl font-black mb-4">準備好讓你的影片爆紅了嗎？</h2>
          <p className="text-white/40 mb-8">免費試用 3 次，不需信用卡，3 分鐘就能拿到你的第一個爆款腳本</p>
          <Link
            href="/register"
            className="inline-block bg-brand-500 hover:bg-brand-400 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,61,48,0.4)]"
          >
            免費開始使用 →
          </Link>
        </Reveal>
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
