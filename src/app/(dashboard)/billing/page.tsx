'use client'
// src/app/(dashboard)/billing/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

const PLAN_NAMES: Record<string, string> = { FREE: '免費方案', CREATOR: 'Creator 方案', PRO: 'Pro 方案' }
const PLAN_PRICES: Record<string, string> = { FREE: 'NT$0/月', CREATOR: 'NT$390/月', PRO: 'NT$890/月' }

export default function BillingPage() {
  const [plan, setPlan] = useState('FREE')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage').then((r) => r.json()).then((d) => {
      if (d.plan) setPlan(d.plan)
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black mb-2">帳單</h1>
        <p className="text-white/40">管理你的訂閱方案與付款資訊</p>
      </div>

      {/* Current plan */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4">目前方案</h2>
        {loading ? (
          <div className="h-16 shimmer rounded-xl" />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-black mb-1">{PLAN_NAMES[plan]}</div>
              <div className="text-white/40 text-sm">{PLAN_PRICES[plan]}</div>
            </div>
            {plan === 'FREE' ? (
              <Link href="/plans" className="bg-brand-500 hover:bg-brand-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
                升級方案 ⚡
              </Link>
            ) : (
              <span className="text-green-400 text-sm font-medium bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                ✓ 訂閱中
              </span>
            )}
          </div>
        )}
      </div>

      {/* TapPay payment setup */}
      {plan !== 'FREE' && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold mb-4">付款方式</h2>
          <div className="bg-dark-700 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-gradient-to-r from-blue-600 to-blue-400 rounded-md flex items-center justify-center text-white text-xs font-bold">VISA</div>
              <span className="text-white/60 text-sm">•••• •••• •••• 4242</span>
            </div>
            <button className="text-xs text-white/40 hover:text-white transition-colors">更換</button>
          </div>
        </div>
      )}

      {/* Billing history */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4">帳單記錄</h2>
        {plan === 'FREE' ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-white/40 text-sm">尚無帳單記錄</p>
            <Link href="/plans" className="text-brand-400 text-sm hover:underline mt-2 inline-block">升級以開始使用付費功能</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { date: '2025-01-01', amount: 'NT$390', status: '已付款', plan: 'Creator 方案' },
            ].map((bill, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{bill.plan}</p>
                  <p className="text-xs text-white/35">{bill.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{bill.amount}</p>
                  <p className="text-xs text-green-400">{bill.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel subscription */}
      {plan !== 'FREE' && (
        <div className="glass rounded-2xl p-6 border border-red-500/10">
          <h2 className="font-bold mb-2 text-red-400">取消訂閱</h2>
          <p className="text-white/40 text-sm mb-4">取消後仍可使用至當月底，到期後自動轉為免費方案</p>
          <button className="text-red-400 text-sm border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500/10 transition-colors">
            取消訂閱
          </button>
        </div>
      )}
    </div>
  )
}
