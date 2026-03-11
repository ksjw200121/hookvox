'use client'
// src/app/(dashboard)/dashboard/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UsageData {
  plan: string
  used: number
  limit: number
}

export default function DashboardPage() {
  const [usage, setUsage] = useState<UsageData>({ plan: 'FREE', used: 0, limit: 3 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.json())
      .then(d => {
        // API 回傳格式：{ plan, usage: { analyze, script, titles, ideas } }
        const u = d.usage || {}
        const totalUsed = (u.analyze?.used || 0) + (u.script?.used || 0) + (u.titles?.used || 0) + (u.ideas?.used || 0)
        const totalLimit = (u.analyze?.limit || 0) + (u.script?.limit || 0) + (u.titles?.limit || 0) + (u.ideas?.limit || 0)
        setUsage({
          plan: d.plan || 'FREE',
          used: totalUsed,
          limit: totalLimit || 3,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const remaining = Math.max(0, usage.limit - usage.used)
  const percent = usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0

  const planLabel: Record<string, string> = {
    FREE: '免費試用',
    BASIC: '基礎版',
    PRO: '專業版',
    FLAGSHIP: '旗艦版',
  }

  const planColor: Record<string, string> = {
    FREE: 'text-white/50',
    BASIC: 'text-blue-400',
    PRO: 'text-brand-400',
    FLAGSHIP: 'text-yellow-400',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-black mb-2">控制台</h1>
        <p className="text-white/40">歡迎回來，你可以開始分析爆款內容。</p>
      </div>

      {/* 使用量卡片 */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-sm text-white/40 mb-1">本月使用量</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{loading ? '—' : usage.used}</span>
              <span className="text-white/40">/ {loading ? '—' : usage.limit} 次</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/40 mb-1">目前方案</div>
            <div className={`text-lg font-bold ${planColor[usage.plan] || 'text-white/50'}`}>
              {planLabel[usage.plan] || usage.plan}
            </div>
          </div>
        </div>

        {/* 進度條 */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-yellow-500' : 'bg-brand-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${
            remaining === 0 ? 'text-red-400' : remaining <= 5 ? 'text-yellow-400' : 'text-white/50'
          }`}>
            {loading ? '讀取中...' : remaining === 0 ? '⚠️ 次數已用完，請升級方案' : `剩餘 ${remaining} 次`}
          </span>
          {usage.plan === 'FREE' && remaining < 3 && (
            <Link href="/plans" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              升級方案 →
            </Link>
          )}
        </div>

        {/* 次數說明 */}
        <div className="mt-4 pt-4 border-t border-white/5 text-xs text-white/30 space-y-1">
          <p>每按一次「生成腳本」扣 1 次 · 分析影片 + 腳本 + 標題 + 分鏡全部包含在內</p>
          <p>次數每月 1 日重置 · 剩餘次數不累計至下個月</p>
        </div>
      </div>

      {/* 快速入口 */}
      <div>
        <h2 className="text-xl font-bold mb-4">快速開始</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/analyze"
            className="glass rounded-2xl p-6 hover:border-brand-500/30 transition-all group block"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-xl font-bold mb-1 group-hover:text-brand-400 transition-colors">爆款分析</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              貼上 IG Reels、TikTok、YouTube Shorts 網址，AI 拆解爆款公式並生成你的腳本
            </p>
            <div className="mt-4 text-brand-400 text-sm font-medium">
              開始分析 →
            </div>
          </Link>

          <Link
            href="/viral-db"
            className="glass rounded-2xl p-6 hover:border-white/15 transition-all group block"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-xl font-bold mb-1 group-hover:text-white transition-colors">爆款資料庫</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              查看所有分析過的爆款內容，建立你的靈感素材庫
            </p>
            <div className="mt-4 text-white/40 text-sm font-medium">
              查看資料庫 →
            </div>
          </Link>
        </div>
      </div>

      {/* 使用提醒 */}
      {remaining === 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-bold text-red-400 mb-1">本月次數已用完</h3>
              <p className="text-white/60 text-sm mb-4">
                升級方案即可繼續使用。基礎版 60次/月，專業版 200次/月。
              </p>
              <Link
                href="/plans"
                className="inline-block bg-brand-500 hover:bg-brand-400 text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors"
              >
                立即升級 →
              </Link>
            </div>
          </div>
        </div>
      )}

      {remaining > 0 && remaining <= 5 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-yellow-400 text-sm font-medium">
            ⚡ 注意：本月僅剩 {remaining} 次，用完後需升級才能繼續使用
          </p>
          <Link href="/plans" className="text-yellow-400 hover:text-yellow-300 text-sm font-bold whitespace-nowrap transition-colors">
            查看方案 →
          </Link>
        </div>
      )}
    </div>
  )
}
