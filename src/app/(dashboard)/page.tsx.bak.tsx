export default function DashboardPage() {
  const usageItems = [
    { label: "今日分析", icon: "🔍", used: 0, limit: 3 },
    { label: "今日腳本", icon: "✍️", used: 0, limit: 3 },
    { label: "今日標題", icon: "💥", used: 0, limit: 20 },
    { label: "今日創意", icon: "💡", used: 0, limit: 30 },
  ];

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-2">控制台</h1>
        <p className="text-white/60 mb-8">歡迎回來，這裡是你的內容工作台。</p>

        <div className="grid gap-4 md:grid-cols-4">
          {usageItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="text-2xl mb-3">{item.icon}</div>
              <div className="text-lg font-semibold">{item.label}</div>
              <div className="text-white/60 mt-2">
                {item.used} / {item.limit}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <a
            href="/analyze"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition block"
          >
            <h2 className="text-2xl font-bold mb-2">貼文分析</h2>
            <p className="text-white/60">
              貼上 Instagram、TikTok 或 YouTube Shorts 的公開貼文網址，分析爆款邏輯。
            </p>
          </a>

          <a
            href="/titles"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition block"
          >
            <h2 className="text-2xl font-bold mb-2">標題生成</h2>
            <p className="text-white/60">
              輸入主題，一次生成多個適合短影音的爆款標題。
            </p>
          </a>

          <a
            href="/ideas"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition block"
          >
            <h2 className="text-2xl font-bold mb-2">內容方向</h2>
            <p className="text-white/60">
              不知道拍什麼時，快速生成一批短影音題材與方向。
            </p>
          </a>

          <a
            href="/viral-db"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition block"
          >
            <h2 className="text-2xl font-bold mb-2">爆款資料庫</h2>
            <p className="text-white/60">
              查看已分析過的內容，整理自己的爆款靈感庫。
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}