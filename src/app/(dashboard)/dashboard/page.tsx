'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UsageItem {
  used: number
  limit: number
  remaining: number
}

interface UsageResponse {
  plan: string
  usage: {
    analyze: UsageItem
    generate: UsageItem
    week?: { analyze: number; generate: number }
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<UsageResponse>({
    plan: 'FREE',
    usage: {
      analyze: { used: 0, limit: 3, remaining: 3 },
      generate: { used: 0, limit: 3, remaining: 3 },
    },
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadUsage() {
      try {
        if (!mounted) return
        const supabase = createClient()

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('取得 session 失敗:', sessionError)
          return
        }

        const token = session?.access_token

        if (!token) {
          console.error('找不到登入 token')
          return
        }

        const res = await fetch('/api/usage', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent('/dashboard')}`
          return
        }

        const json = await res.json()

        if (!res.ok) {
          console.error('讀取 usage 失敗:', json)
          return
        }

        if (!mounted) return

        setData({
          plan: json.plan || 'FREE',
          usage: {
            analyze: {
              used: json.usage?.analyze?.used || 0,
              limit: json.usage?.analyze?.limit || 3,
              remaining: json.usage?.analyze?.remaining ?? 3,
            },
            generate: {
              used: json.usage?.generate?.used || 0,
              limit: json.usage?.generate?.limit || 3,
              remaining: json.usage?.generate?.remaining ?? 3,
            },
            week: json.usage?.week
              ? { analyze: json.usage.week.analyze ?? 0, generate: json.usage.week.generate ?? 0 }
              : undefined,
          },
        })
      } catch (error) {
        console.error('dashboard usage fetch error:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadUsage()

    const onFocus = () => loadUsage()
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadUsage()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const analyze = data.usage.analyze
  const generate = data.usage.generate

  const totalUsed = analyze.used + generate.used
  const totalLimit = analyze.limit + generate.limit
  const totalRemaining = Math.max(totalLimit - totalUsed, 0)

  const percent =
    totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0

  let progressColor = 'bg-green-500'
  if (percent >= 85) {
    progressColor = 'bg-red-500'
  } else if (percent >= 60) {
    progressColor = 'bg-yellow-500'
  }

  const planLabel: Record<string, string> = {
    FREE: '免費試用',
    CREATOR: '創作者版',
    PRO: '專業版',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-black mb-2">控制台</h1>
        <p className="text-white/40">歡迎回來，你可以開始分析爆款內容。</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-sm text-white/40 mb-1">本月總使用量</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{loading ? '-' : totalUsed}</span>
              <span className="text-white/40">/ {loading ? '-' : totalLimit} 次</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-white/40 mb-1">目前方案</div>
            <div className="text-lg font-bold">
              {planLabel[data.plan] || data.plan}
            </div>
          </div>
        </div>

        <div className="w-full bg-white/10 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div
          className={`text-sm font-medium ${
            totalRemaining <= 1
              ? 'text-red-400'
              : totalRemaining <= 2
              ? 'text-yellow-400'
              : 'text-white/50'
          }`}
        >
          {loading
            ? '讀取中...'
            : totalRemaining === 0
            ? '⚠️ 次數已用完，請升級方案'
            : `剩餘 ${totalRemaining} 次`}
        </div>

        {data.usage.week != null && (
          <div className="mt-3 pt-3 border-t border-white/5 text-sm text-white/50">
            過去 7 天已使用：分析 {data.usage.week.analyze} 次、生成 {data.usage.week.generate} 次
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/5 text-xs text-white/30 space-y-1">
          <p>免費版總額度為 6 次：分析 3 次 + 生成 3 次</p>
          <p>每月 1 日重置，未使用次數不累計至下個月</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-white/40 mb-2">分析次數</div>
          <div className="text-3xl font-black">
            {loading ? '-' : analyze.used} / {loading ? '-' : analyze.limit}
          </div>
          <div className="text-sm text-white/50">
            {loading ? '讀取中...' : `剩餘 ${analyze.remaining} 次`}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-white/40 mb-2">生成次數</div>
          <div className="text-3xl font-black">
            {loading ? '-' : generate.used} / {loading ? '-' : generate.limit}
          </div>
          <div className="text-sm text-white/50">
            {loading ? '讀取中...' : `剩餘 ${generate.remaining} 次`}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">快速開始</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/analyze"
            className="glass rounded-2xl p-6 hover:border-brand-500/30 transition-all group block"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-xl font-bold mb-1 group-hover:text-brand-400 transition-colors">
              爆款分析
            </h3>
            <p className="text-white/50 text-sm leading-relaxed">
              貼上 YouTube Shorts 連結，或上傳音訊 / 影片進行爆款分析並生成你的腳本
            </p>
            <div className="mt-4 text-brand-400 text-sm font-medium">開始分析 →</div>
          </Link>

          <Link
            href="/viral-database"
            className="glass rounded-2xl p-6 hover:border-white/15 transition-all group block"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-xl font-bold mb-1 group-hover:text-white transition-colors">
              爆款資料庫
            </h3>
            <p className="text-white/50 text-sm leading-relaxed">
              查看所有分析過的爆款內容，建立你的靈感素材庫
            </p>
            <div className="mt-4 text-white/40 text-sm font-medium">查看資料庫 →</div>
          </Link>
        </div>
      </div>

      {!loading && (analyze.remaining === 0 || generate.remaining === 0) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-bold text-red-400 mb-1">本月部分次數已用完</h3>
              <p className="text-white/60 text-sm mb-4">
                目前分析或生成至少有一項已達上限，升級方案後可繼續使用。
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
    </div>
  )
}