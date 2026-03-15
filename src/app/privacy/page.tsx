// src/app/privacy/page.tsx
import Link from 'next/link'

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-black mb-3">隱私權政策</h1>
          <p className="text-white/40 text-sm">最後更新：2026 年 3 月</p>
        </div>

        {[
          {
            title: '1. 我們蒐集哪些資料',
            content: `我們只蒐集提供服務所需的最低限度資料：

• 電子郵件地址（用於帳號建立與登入）
• 使用紀錄（每月使用次數，用於次數限制）
• 付款資訊（由綠界科技處理，我們不儲存信用卡號碼）
• 您輸入的影片網址（用於生成腳本，不永久儲存您的輸入內容）

我們不蒐集您的身分證號碼、電話號碼或地址。`,
          },
          {
            title: '2. 我們如何使用您的資料',
            content: `您的資料僅用於以下目的：

• 提供帳號登入與身份驗證
• 計算並管理您的每月使用次數
• 處理付款與訂閱管理
• 發送重要服務通知（不用於廣告）
• 改善服務品質（匿名化統計分析）

我們不會將您的個人資料出售給第三方。`,
          },
          {
            title: '3. 資料儲存與安全',
            content: `您的帳號資料儲存於 Supabase 雲端資料庫（伺服器位於日本東京地區），符合 SOC2 安全標準。

我們採用以下安全措施保護您的資料：
• HTTPS 加密傳輸
• 密碼雜湊儲存（不儲存明文密碼）
• 定期安全更新
• 存取權限最小化原則`,
          },
          {
            title: '4. 第三方服務',
            content: `本服務使用以下第三方服務，各自有其隱私權政策：

• Supabase（資料庫與身份驗證）
• Anthropic Claude（AI 腳本生成）
• OpenAI Whisper（影片語音轉文字）
• 綠界科技（金流付款處理）
• Vercel（網站託管）

使用本服務即表示您同意上述第三方服務的相關條款。`,
          },
          {
            title: '5. Cookie 使用',
            content: `我們使用必要的 Cookie 維持登入狀態。我們不使用追蹤 Cookie 或廣告 Cookie。`,
          },
          {
            title: '6. 您的權利',
            content: `依據個人資料保護法，您有以下權利：

• 查詢或請求閱覽您的個人資料
• 請求補充或更正您的個人資料
• 請求刪除您的帳號與相關資料
• 請求停止蒐集、處理或利用您的個人資料

如需行使上述權利，請聯絡 hookvox.support@gmail.com，我們將於 15 個工作天內回覆。`,
          },
          {
            title: '7. 資料保留期限',
            content: `• 帳號資料：帳號存在期間
• 使用紀錄：保留 12 個月
• 付款紀錄：依法保留 5 年
• 帳號刪除後，個人資料將於 30 天內從系統中移除`,
          },
          {
            title: '8. 未成年人',
            content: `本服務不針對 18 歲以下未成年人。若發現未成年人在未經同意下建立帳號，我們將立即刪除相關資料。`,
          },
          {
            title: '9. 政策修改',
            content: `如有重大修改，我們將透過電子郵件或服務內通知提前告知。繼續使用本服務視為同意修改後的政策。`,
          },
          {
            title: '10. 聯絡我們',
            content: `隱私相關問題請聯絡：hookvox.support@gmail.com`,
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
        <Link href="/terms" className="hover:text-white transition-colors">服務條款</Link>
      </footer>
    </div>
  )
}
