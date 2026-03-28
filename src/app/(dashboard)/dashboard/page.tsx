'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { USAGE_UPDATED_EVENT, type UsageUpdatedDetail } from '@/lib/usage-events'

interface UsageItem {
  used: number
  limit: number
  remaining: number
}

interface DailyUsage {
  date: string
  analyze: number
  generate: number
}

interface UsageResponse {
  plan: string
  subscriptionEndDate?: string | null
  subscriptionStatus?: string | null
  usage: {
    analyze: UsageItem
    generate: UsageItem
    cycleEnd?: string | null
    week?: { analyze: number; generate: number }
    daily?: DailyUsage[]
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<UsageResponse>({
    plan: 'FREE',
    subscriptionEndDate: null,
    subscriptionStatus: null,
    usage: {
      analyze: { used: 0, limit: 3, remaining: 3 },
      generate: { used: 0, limit: 3, remaining: 3 },
      cycleEnd: null,
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

        // 先跑 billing（self-heal 訂閱），再跑 usage（確保方案一致）
        const PLAN_LEVEL_MAP: Record<string, number> = { FREE: 0, CREATOR: 1, PRO: 2, FLAGSHIP: 3 }

        const billingRes = await fetch('/api/billing', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const billingJson = billingRes.ok ? await billingRes.json() : null
        const billingPlan = String(billingJson?.subscription?.plan || 'FREE').trim().toUpperCase()

        const usageRes = await fetch('/api/usage', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        })

        if (usageRes.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent('/dashboard')}`
          return
        }

        const json = await usageRes.json()

        if (!usageRes.ok) {
          console.error('讀取 usage 失敗:', json)
          return
        }

        if (!mounted) return

        const usagePlan = String(json.plan || 'FREE').trim().toUpperCase()
        // 取較高方案
        const effectivePlan = (PLAN_LEVEL_MAP[billingPlan] ?? 0) >= (PLAN_LEVEL_MAP[usagePlan] ?? 0)
          ? billingPlan : usagePlan
        const analyzeUsed = json.usage?.analyze?.used || 0
        const generateUsed = json.usage?.generate?.used || 0
        const analyzeLimit = json.usage?.analyze?.limit ?? 3
        const generateLimit = json.usage?.generate?.limit ?? 3

        setData({
          plan: effectivePlan,
          subscriptionEndDate: billingJson?.subscription?.endDate ?? null,
          subscriptionStatus: billingJson?.subscription?.status ?? null,
          usage: {
            analyze: {
              used: analyzeUsed,
              limit: analyzeLimit,
              remaining: json.usage?.analyze?.remaining ?? Math.max(0, analyzeLimit - analyzeUsed),
            },
            generate: {
              used: generateUsed,
              limit: generateLimit,
              remaining: json.usage?.generate?.remaining ?? Math.max(0, generateLimit - generateUsed),
            },
            cycleEnd: json.usage?.analyze?.cycleEnd ?? null,
            week: json.usage?.week
              ? { analyze: json.usage.week.analyze ?? 0, generate: json.usage.week.generate ?? 0 }
              : undefined,
            daily: json.usage?.daily || undefined,
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
    const onUsageUpdated = (e: Event) => {
      if (!mounted) return
      const detail = (e as CustomEvent<UsageUpdatedDetail>).detail
      if (!detail) return

      setData((prev) => ({
        plan: detail.plan || prev.plan || 'FREE',
        subscriptionEndDate: prev.subscriptionEndDate ?? null,
        subscriptionStatus: prev.subscriptionStatus ?? null,
        usage: {
          analyze: {
            used: detail.usage?.analyze?.used ?? prev.usage.analyze.used ?? 0,
            limit: detail.usage?.analyze?.limit ?? prev.usage.analyze.limit ?? 3,
            remaining: detail.usage?.analyze?.remaining ?? prev.usage.analyze.remaining ?? 3,
          },
          generate: {
            used: detail.usage?.generate?.used ?? prev.usage.generate.used ?? 0,
            limit: detail.usage?.generate?.limit ?? prev.usage.generate.limit ?? 3,
            remaining: detail.usage?.generate?.remaining ?? prev.usage.generate.remaining ?? 3,
          },
          cycleEnd:
            detail.usage?.analyze?.cycleEnd ??
            detail.usage?.generate?.cycleEnd ??
            prev.usage.cycleEnd ??
            null,
          week: detail.usage?.week
            ? {
                analyze: detail.usage.week.analyze ?? prev.usage.week?.analyze ?? 0,
                generate: detail.usage.week.generate ?? prev.usage.week?.generate ?? 0,
              }
            : prev.usage.week,
        },
      }))
    }

    window.addEventListener(USAGE_UPDATED_EVENT, onUsageUpdated)

    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(USAGE_UPDATED_EVENT, onUsageUpdated)
    }
  }, [])

  const analyze = data.usage.analyze
  const generate = data.usage.generate

  const totalUsed = analyze.used + generate.used
  const totalLimit = analyze.limit + generate.limit
  const totalRemaining = Math.max(totalLimit - totalUsed, 0)
  const cycleEnd = data.usage.cycleEnd || data.subscriptionEndDate || null

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getDaysUntil = (iso?: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  const daysUntilExpiry = getDaysUntil(cycleEnd)
  const isPaidPlan = data.plan !== 'FREE'
  const isExpiringSoon =
    isPaidPlan && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7
  const isExpired = data.subscriptionStatus === 'EXPIRED' || (isPaidPlan && daysUntilExpiry !== null && daysUntilExpiry < 0)

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
    FLAGSHIP: '旗艦版',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-black mb-2">控制台</h1>
        <p className="text-white/40">歡迎回來，你可以開始分析爆款內容。</p>
      </div>

      {!loading && isExpiringSoon && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 px-5 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-amber-300 mb-1">訂閱即將到期</p>
              <p className="text-sm text-white/70">
                你的方案將於 {formatDate(cycleEnd)} 到期，約剩 {daysUntilExpiry} 天。
                到期後會回到免費方案，如要繼續使用請手動重新訂閱。
              </p>
            </div>
            <Link
              href="/plans"
              className="bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              前往續訂
            </Link>
          </div>
        </div>
      )}

      {!loading && isExpired && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-red-300 mb-1">訂閱已到期</p>
              <p className="text-sm text-white/70">
                你目前已回到免費方案。若要恢復付費額度，請到方案頁重新訂閱。
              </p>
            </div>
            <Link
              href="/plans"
              className="bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              重新訂閱
            </Link>
          </div>
        </div>
      )}

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
          <p>依目前訂閱週期計算，到期後會回到免費方案；未使用次數不累計至下期</p>
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

      {/* ── 過去 7 天使用趨勢 ── */}
      {!loading && data.usage.daily && data.usage.daily.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold mb-4">過去 7 天使用趨勢</h2>
          {(() => {
            const daily = data.usage.daily!;
            const maxVal = Math.max(...daily.map((d) => d.analyze + d.generate), 1);
            const barH = 120;
            return (
              <div className="flex items-end gap-2 justify-between" style={{ height: barH + 40 }}>
                {daily.map((d) => {
                  const total = d.analyze + d.generate;
                  const aH = Math.round((d.analyze / maxVal) * barH);
                  const gH = Math.round((d.generate / maxVal) * barH);
                  const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(d.date + 'T00:00:00').getDay()];
                  const shortDate = d.date.slice(5).replace('-', '/');
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                      <div className="text-xs text-white/40 font-medium">{total > 0 ? total : ''}</div>
                      <div className="flex flex-col items-center justify-end" style={{ height: barH }}>
                        {gH > 0 && (
                          <div
                            className="w-6 sm:w-8 rounded-t bg-blue-500/70"
                            style={{ height: gH }}
                            title={`生成 ${d.generate}`}
                          />
                        )}
                        {aH > 0 && (
                          <div
                            className={`w-6 sm:w-8 bg-brand-500/70 ${gH > 0 ? '' : 'rounded-t'} rounded-b`}
                            style={{ height: aH }}
                            title={`分析 ${d.analyze}`}
                          />
                        )}
                        {total === 0 && (
                          <div className="w-6 sm:w-8 bg-white/5 rounded h-1" />
                        )}
                      </div>
                      <div className="text-xs text-white/30">{shortDate}</div>
                      <div className="text-xs text-white/20">{weekday}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/5 text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-brand-500/70" />
              分析
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/70" />
              生成
            </div>
          </div>
        </div>
      )}

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

      {!loading && percent >= 80 && percent < 100 && totalRemaining > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="font-bold text-amber-300 mb-1">額度即將用完</h3>
              <p className="text-white/60 text-sm mb-4">
                你已使用 {Math.round(percent)}% 的額度（剩餘 {totalRemaining} 次），建議提前升級以免中斷使用。
              </p>
              <Link
                href="/plans"
                className="inline-block bg-amber-500 hover:bg-amber-400 text-black px-6 py-2 rounded-xl font-bold text-sm transition-colors"
              >
                查看升級方案
              </Link>
            </div>
          </div>
        </div>
      )}

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