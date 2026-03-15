'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const [usage, setUsage] = useState<{
    plan: string
    analyze: { used: number; limit: number; remaining: number; cycleEnd: string }
    generate: { used: number; limit: number; remaining: number }
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          if (mounted) setLoading(false)
          return
        }
        const res = await fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok || !mounted) return
        const data = await res.json()
        setUsage({
          plan: data.plan || 'FREE',
          analyze: data.usage?.analyze || { used: 0, limit: 0, remaining: 0, cycleEnd: '' },
          generate: data.usage?.generate || { used: 0, limit: 0, remaining: 0 },
        })
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const t = setTimeout(() => router.replace('/plans'), 8000)
    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-3xl font-black mb-4">付款成功</h1>
        <p className="text-white/70 mb-4">方案已更新，本期額度已生效。</p>

        {loading && <p className="text-white/40 text-sm">讀取額度中...</p>}
        {!loading && usage && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6 text-left">
            <div className="text-sm text-white/50 mb-2">目前方案 · {usage.plan}</div>
            <div className="text-white/80 text-sm">
              分析剩餘 <strong className="text-white">{usage.analyze.remaining}</strong> / {usage.analyze.limit} 次
              {' · '}
              生成剩餘 <strong className="text-white">{usage.generate.remaining}</strong> / {usage.generate.limit} 次
            </div>
            {usage.analyze.cycleEnd && (
              <div className="text-xs text-white/40 mt-2">
                本期到期日：{new Date(usage.analyze.cycleEnd).toLocaleDateString('zh-TW')}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/analyze"
            className="inline-block bg-brand-500 hover:bg-brand-400 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
          >
            前往爆款分析 →
          </Link>
          <Link
            href="/plans"
            className="inline-block bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            返回方案頁
          </Link>
        </div>
        <p className="text-white/40 text-xs mt-4">8 秒後將自動返回方案頁</p>
      </div>
    </div>
  )
}
