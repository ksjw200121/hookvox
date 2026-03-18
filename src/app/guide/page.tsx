import Link from "next/link";

/** 每個大步驟底下拆成「連國小生都懂」的小步驟 */
const steps = [
  {
    id: "register",
    title: "第一步：註冊帳號（第一次使用一定要做）",
    desc: "沒有帳號就不能用爆款分析跟生成腳本。註冊是免費的，而且會送你 3 次分析 + 3 次生成，不用先付錢。",
    detail: [
      "打開 Hookvox 首頁，點上面或下面的「免費試用」或「註冊」按鈕。",
      "你會進到註冊頁面。上面有幾個空格要填：",
      "① 第一個空格：填你的「Email」（就是你的電子信箱，例如 xxx@gmail.com）。",
      "② 第二個空格：填你要設的「密碼」。密碼要至少 6 個字，自己記好。",
      "③ 下面可能有一個「勾選框」或「我不是機器人」的驗證，照著畫面點選或打勾。",
      "全部填好後，按「註冊」或「送出」按鈕。",
      "註冊成功的話，你會自動登入，並被帶到「控制台」頁面。這裡可以看到你這個月還有幾次可以用（免費是 3 次分析 + 3 次生成）。",
    ],
    tip: "如果之後要再進來，就點「登入」，用同一組 Email 和密碼即可。",
    cta: "前往註冊",
    href: "/register",
  },
  {
    id: "analyze",
    title: "第二步：爆款分析（讓 AI 幫你拆解一支爆紅的影片）",
    desc: "你要先選一支「別人已經拍紅的影片」，讓 Hookvox 幫你分析：這支影片為什麼紅？開頭怎麼抓人？我們把這個步驟叫做「爆款分析」。",
    detail: [
      "登入後，點左邊或上面的「爆款分析」，進入分析頁面。",
      "你要給 Hookvox 一支影片。有兩種方式：",
      "方式 A — 貼網址：找到「貼上影片網址」的空格，把你想學的那支影片的網址複製過來貼上（YouTube、IG Reels、TikTok 等都可以）。",
      "方式 B — 上傳檔案：如果你影片已經下載在電腦或手機，可以點「上傳音訊或影片」，選你的檔案。上傳後系統只會先檢查格式，還不會扣你的次數。",
      "弄好網址或檔案之後，先不要急著按分析。請先找到「開始爆款分析」這個按鈕。",
      "按下「開始爆款分析」後，會跳出一個小視窗，告訴你：等一下會先轉錄（把影片變成文字），再分析，而且會扣掉 1 次「分析」的額度。確認沒問題就按「確認」。",
      "接著畫面會顯示處理中，等幾十秒到一兩分鐘（看影片長度）。完成後，你就會看到一整頁的分析結果。",
      "結果裡會有：核心主題、Hook 類型、開頭 Hook、分析摘要、痛點、關鍵洞察、爆款公式……這些都是 AI 幫你整理好的，你可以從這裡學到「這支影片為什麼會紅」。",
    ],
    tip: "免費方案只有 3 次分析，所以先選你真的想學、想模仿的那幾支影片來分析。",
    cta: "前往爆款分析",
    href: "/analyze",
  },
  {
    id: "generate",
    title: "第三步：生成腳本與標題（把爆款套成「你的」內容）",
    desc: "分析完別人的爆款之後，下一步是：用同樣的結構，但換成「你的主題、你的主角」。AI 會幫你生出好幾版腳本跟很多個標題，你選喜歡的用就好。",
    detail: [
      "在爆款分析結果頁面，往下面捲，會看到「生成腳本與標題」的區塊。",
      "先填兩個東西：①「行業」：選你最接近的（例如美業、保險、食譜、健身……）。②「你的主題／主角」：用一句話寫你要拍什麼，例如「減脂 3 個月的心得」「紋繡前的 3 個注意事項」。",
      "填好之後，按「生成腳本與標題」按鈕。這裡會扣掉 1 次「生成」的額度（免費方案共 3 次）。",
      "等一會兒，畫面上就會出現：好幾版腳本（例如對話型、數字型、身份認同型）、很多個標題、有的行業還會給分鏡表。",
      "你可以多看幾版，選一個最順的腳本、幾個喜歡的標題，之後拍片就用這些。",
      "如果覺得想微調，可以改一下「你的主題」再按一次生成（會再扣 1 次生成額度）。",
      "滿意之後，記得按「保存到爆款資料庫」。按了之後，這支影片的分析 + 腳本 + 標題都會存起來，之後在「爆款資料庫」裡都找得到。",
    ],
    tip: "標題可以多選幾個，拍完片之後 A/B 測試不同標題，看哪個點擊率高。",
    cta: "前往爆款分析",
    href: "/analyze",
  },
  {
    id: "database",
    title: "第四步：爆款資料庫與靈感簿（把你分析過的都存好）",
    desc: "所有你「分析過」或「保存過」的影片，都會出現在「爆款資料庫」。你可以在這裡搜尋、收藏、複製標題、甚至匯出成一份筆記。",
    detail: [
      "點左邊或上面的「爆款資料庫」，就會進到資料庫頁面。",
      "你會看到兩個分頁：「全部影片」和「靈感簿」。全部影片 = 你所有分析過的；靈感簿 = 你特別收藏起來的。",
      "想找某支影片時：在搜尋框輸入關鍵字（例如主題、Hook、痛點、標題裡的某幾個字），按「搜尋」，就會篩出符合的影片。",
      "看到喜歡的影片，想之後容易找到：按那支影片卡片上的「加入靈感簿」按鈕，它就會出現在「靈感簿」分頁裡。",
      "如果你升級成 Pro 或旗艦方案：在每支影片的「已保存的生成內容」區塊，會多一個「一鍵複製全部標題」按鈕，按下去就會把所有標題複製到剪貼簿，方便你貼到別的地方用。",
      "同樣地，Pro / 旗艦在每支影片卡片上會多一個「匯出 .txt」按鈕。按下去會下載一份文字檔，裡面有：原影片連結、分析內容、標題、腳本，方便你存檔或列印。",
    ],
    tip: "靈感簿就像「我的最愛」，把最想參考的幾支放在這裡，之後要做新片時直接來翻。",
    cta: "前往爆款資料庫",
    href: "/viral-db",
  },
  {
    id: "angles",
    title: "第五步：爆款延伸角度與延伸腳本（一支影片變好多版本）",
    desc: "同一支爆款，還可以再延伸出「不同角度」的腳本。例如同一支影片，可以變成「角度 A：省錢版」「角度 B：懶人版」「角度 C：專業版」。每個角度都可以再生成一整份腳本。",
    detail: [
      "在爆款資料庫裡，每一支影片往下捲，會看到「爆款延伸」這個區塊。",
      "如果這支影片還沒生成過延伸：會有一個按鈕「生成 3 個爆款延伸」。按下去之後，AI 會給你 3 個不同的「角度」跟對應的 Hook（開頭），每個角度都不一樣。",
      "每個角度下面會有一個「生成延伸腳本」按鈕。按下去，AI 就會幫那個角度寫出一份完整腳本（開頭 + 中間 + 結尾 CTA）。",
      "要注意：免費方案「不能」生成延伸腳本。Creator 方案每支影片可以生成 1 個延伸腳本；Pro 和旗艦每支可以生成 3 個。所以你會看到按鈕能不能按，是依你的方案決定的。",
    ],
    tip: "延伸腳本很適合「同一支爆款想拍好幾種版本」的時候用，例如同一個主題拍給不同客群看。",
    cta: "前往爆款資料庫",
    href: "/viral-db",
  },
  {
    id: "plans",
    title: "第六步：方案與付費、帳單（額度用完想升級看這裡）",
    desc: "免費試用只有 3 次分析 + 3 次生成。用完之後若還想繼續用，就要升級方案。這裡也說明在哪裡看自己用了幾次、什麼時候到期。",
    detail: [
      "「方案」頁：點左邊或上面的「方案」，可以看到 Free、Creator、Pro、旗艦的差別（每個月幾次、多少錢）。選一個方案後按「升級」或「訂閱」，就會引導你去付款（綠界金流）。",
      "「帳單」頁：這裡可以看到你「現在是哪一個方案」、「這期已經用了幾次 / 總共幾次」、「這期到哪一天到期」（下次續訂日）、以及過去的付款記錄。",
      "「控制台」頁：一登入就會看到「本月總使用量」和「過去 7 天已使用：分析 X 次、生成 Y 次」，讓你快速知道還剩多少額度。",
      "升級時：如果你是在有效期內從較便宜的付費方案升到較高方案（例如 Creator 升 Pro），系統會用目標方案原價扣掉你目前方案已付款金額，原本已使用的次數會延續。付費升級目前只能選擇與現有方案相同的訂閱週期。免費升付費或已到期後重新訂閱，則會開新週期並重新計算額度。目前尚未開放自動扣款。",
    ],
    tip: "怕忘記用了幾次的話，可以常去控制台或帳單頁看一下「剩餘次數」和「到期日」。",
    cta: "查看方案",
    href: "/plans",
  },
];

export default function GuidePage() {
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
            <Link href="/success-cases" className="text-sm text-white/60 hover:text-white transition-colors">
              成功案例
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

      <section className="pt-28 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm px-4 py-2 rounded-full mb-6">
            一步一步來，照做就會用
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">
            全部功能步驟教學
          </h1>
          <p className="text-white/50 text-lg leading-relaxed">
            從註冊到付費，每個步驟都拆開講。照著做，連第一次用的人也能完成。
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-14">
          {steps.map((s, i) => (
            <div
              key={s.id}
              id={s.id}
              className="glass rounded-2xl p-8 space-y-6 scroll-mt-28"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-black text-white mb-2">{s.title}</h2>
                  <p className="text-white/60 text-sm leading-relaxed">{s.desc}</p>
                </div>
                <Link
                  href={s.href}
                  className="shrink-0 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold transition-colors"
                >
                  {s.cta}
                </Link>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-bold text-white/80">具體怎麼做：</div>
                <ol className="space-y-3">
                  {s.detail.map((item, j) => (
                    <li
                      key={j}
                      className="flex gap-3 text-white/85 text-sm leading-relaxed"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-brand-500/25 text-brand-300 text-xs font-bold flex items-center justify-center">
                        {j + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {s.tip && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                  <div className="text-xs font-bold text-amber-300/90 mb-1">💡 小提醒</div>
                  <p className="text-white/80 text-sm leading-relaxed">{s.tip}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-xl font-bold text-center transition-all"
          >
            免費試用 3 次
          </Link>
          <Link
            href="/success-cases"
            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-medium text-center transition-colors"
          >
            看爆款成功案例
          </Link>
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
            <Link href="/success-cases" className="hover:text-white transition-colors">成功案例</Link>
            <Link href="/plans" className="hover:text-white transition-colors">方案</Link>
            <Link href="/terms" className="hover:text-white transition-colors">服務條款</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">隱私權政策</Link>
            <Link href="/refund" className="hover:text-white transition-colors">退款政策</Link>
            <a href="mailto:hookvox.support@gmail.com" className="hover:text-white transition-colors">聯繫我們</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
