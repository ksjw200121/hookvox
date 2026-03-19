import Link from 'next/link'

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Hookvox</Link>
          <div className="flex gap-4 text-sm text-white/50">
            <Link href="/terms" className="hover:text-white transition-colors">服務條款</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">隱私權政策</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <div>
          <h1 className="text-4xl font-black mb-3">退款政策</h1>
          <p className="text-white/40 text-sm">最後更新：2026 年 3 月</p>
        </div>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">數位內容與鑑賞期</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Hookvox 為數位內容服務，付款後即可立即使用（方案額度、功能權限等）。依據消費者保護法第 19 條第 1 項第 6 款，<strong className="text-white">數位內容一經提供，即喪失七天鑑賞期之退款權利</strong>。因此，完成付款並取得使用權限後，恕不接受以「不滿意」「用不到」等理由申請退款。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">例外處理</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            若因系統錯誤導致重複扣款、或未開通方案卻已扣款等明顯疏失，請於 7 日內提供訂單資訊與說明，寄至 ksjw200121@gmail.com，我們將個案審核並依情況辦理全額或差額退款。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">取消訂閱與到期</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            訂閱可隨時取消，取消後仍可使用至當期結束日止。到期後若未續訂，方案將降為免費方案，額度依免費方案計算。取消訂閱不提供已使用期間的部份退款。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">聯絡我們</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            退款相關問題請來信：ksjw200121@gmail.com，我們將於 15 個工作天內回覆。
          </p>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-white/30 text-sm">
        <Link href="/" className="hover:text-white transition-colors">返回首頁</Link>
        <span className="mx-3">·</span>
        <Link href="/terms" className="hover:text-white transition-colors">服務條款</Link>
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-white transition-colors">隱私權政策</Link>
      </footer>
    </div>
  )
}
