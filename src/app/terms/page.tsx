// src/app/terms/page.tsx
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Hookvox</Link>
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">登入</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-10">
        <div>
          <h1 className="text-4xl font-black mb-3">服務條款</h1>
          <p className="text-white/40 text-sm">最後更新：2026 年 3 月</p>
        </div>

        {[
          {
            title: '1. 服務說明',
            content: `Hookvox（以下稱「本服務」）由金孫（以下稱「本公司」）提供，為一款以人工智慧技術輔助短影音腳本創作的數位工具。本服務透過分析公開影片內容，生成創作參考腳本、標題與分鏡建議。

使用本服務，即表示您同意本條款。若不同意，請勿使用本服務。`,
          },
          {
            title: '2. 使用資格',
            content: `使用本服務須年滿 18 歲，或在法定監護人同意下使用。
            
您保證提供的帳號資訊真實、完整，並對帳號安全負責。請勿將帳號分享給他人使用，每個帳號僅限本人使用。`,
          },
          {
            title: '3. 數位內容服務與付款',
            content: `本服務為數位內容服務，付款後即可立即使用。

依據消費者保護法第19條第1項第6款，數位內容一經提供，即喪失七天鑑賞期之退款權利。用戶於付款前將被要求明確勾選確認同意此條款，方可完成購買。

各方案次數於每月1日重置，未使用次數不累計至下月，亦不退款。`,
          },
          {
            title: '4. 使用限制',
            content: `您同意不得使用本服務從事以下行為：

• 生成不實、誤導、詐騙性質的內容
• 侵害他人著作權、商標權或其他智慧財產權
• 生成仇恨、歧視、色情或違法內容
• 利用本服務從事任何違反中華民國法律之行為
• 以自動化程式、機器人或任何方式繞過次數限制
• 嘗試反向工程、破解或入侵本服務系統

違反上述規定，本公司保留立即終止帳號並不退款之權利。`,
          },
          {
            title: '5. 著作權與內容責任',
            content: `本服務所生成之腳本、標題等內容為 AI 輔助創作，僅供參考。

用戶須自行確認所輸入之影片網址為公開內容，且使用生成結果時符合相關著作權法規。本公司不對用戶輸入或使用生成內容所產生之任何著作權爭議負責。

用戶對其透過本服務創作、發布之內容負完全責任。`,
          },
          {
            title: '6. 服務穩定性',
            content: `本服務可能因系統維護、升級或不可抗力因素暫時中斷。本公司會盡力維持服務穩定，但不保證100%無中斷。

計畫內的維護將提前通知用戶。因不可抗力造成的服務中斷，本公司不負賠償責任。`,
          },
          {
            title: '7. 免責聲明',
            content: `本服務按「現狀」提供，不提供任何明示或暗示之保證。

本公司不保證使用本服務生成的內容能達到特定行銷效果或轉換率，生成結果僅為創作參考。

在法律允許的最大範圍內，本公司對任何間接、附帶、特殊或懲罰性損害不承擔責任。`,
          },
          {
            title: '8. 條款修改',
            content: `本公司保留隨時修改本條款之權利。重大修改將透過電子郵件或服務內通知告知用戶。繼續使用本服務視為同意修改後的條款。`,
          },
          {
            title: '9. 準據法與管轄',
            content: `本條款依中華民國法律解釋及執行。如發生爭議，雙方同意以台灣台中地方法院為第一審管轄法院。`,
          },
          {
            title: '10. 聯絡方式',
            content: `如有任何問題，請聯絡：support@hookvox.ai`,
          },
        ].map(section => (
          <section key={section.title}>
            <h2 className="text-xl font-bold mb-3 text-white">{section.title}</h2>
            <div className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-white/30 text-sm">
        © 2026 Hookvox — by 金孫
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-white transition-colors">隱私權政策</Link>
      </footer>
    </div>
  )
}
