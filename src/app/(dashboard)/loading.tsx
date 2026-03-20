export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* 標題骨架 */}
      <div className="space-y-3">
        <div className="h-9 w-48 bg-white/10 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded" />
      </div>

      {/* 卡片骨架 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4"
          >
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-8 w-32 bg-white/10 rounded" />
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-3/4 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* 內容骨架 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="h-5 w-36 bg-white/10 rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 bg-white/5 rounded" style={{ width: `${90 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
