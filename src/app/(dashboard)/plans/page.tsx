'use client'
// src/app/(dashboard)/plans/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type BillingCycle = 'monthly' | 'quarterly' | 'biannual' | 'annual'

const BILLING_OPTIONS = [
  { key: 'monthly' as BillingCycle, label: '月繳', discount: '', months: 1, multiplier: 1 },
  { key: 'quarterly' as BillingCycle, label: '季繳', discount: '省10%', months: 3, multiplier: 0.9 },
  { key: 'biannual' as BillingCycle, label: '半年繳', discount: '省15%', months: 6, multiplier: 0.85 },
  { key: 'annual' as BillingCycle, label: '年繳', discount: '省20%', months: 12, multiplier: 0.8 },
]

const PLANS = [
  {
    key: 'FREE',
    name: '免費試用',
    normalMonthly: 0,
    earlybirdMonthly: 0,
    features: ['3 次分析 + 3 次生成（總計）', '完整功能試用', '腳本 + 標題 + 分鏡', '無延伸腳本', '不需信用卡'],
    highlight: false,
    cta: '體驗中',
    badge: '',
  },
  {
    key: 'CREATOR',
    name: 'Creator',
    normalMonthly: 699,
    earlybirdMonthly: 699,
    features: ['50 次分析 + 50 次生成 / 週期', '腳本 + 標題 + 分鏡', '爆款資料庫', '每支影片可生成 1 個延伸腳本', '套用替換功能'],
    highlight: true,
    cta: '升級 Creator',
    badge: '最多人選',
  },
  {
    key: 'PRO',
    name: '專業版',
    normalMonthly: 1599,
    earlybirdMonthly: 1599,
    features: ['200 次分析 + 200 次生成 / 週期', '腳本 + 標題 + 分鏡', '爆款資料庫', '每支影片可生成 3 個延伸腳本', '一鍵複製全部標題、匯出 .txt', '優先客服、升級差額計算'],
    highlight: false,
    cta: '升級專業版',
    badge: '重度使用者',
  },
]

const FLAGSHIP = {
  key: 'FLAGSHIP',
  name: '旗艦版',
  normalMonthly: 2999,
  earlybirdMonthly: 2999,
  features: ['500 次分析 + 500 次生成 / 週期', '每支影片可生成 3 個延伸腳本', '一鍵複製全部標題、匯出 .txt', '適合重度創作者 / 代操'],
  cta: '升級旗艦版',
}

const EARLY_BIRD_CODE = 'JS2026'

const PLAN_LEVEL: Record<string, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  FLAGSHIP: 3,
}

function calcTotal(monthly: number, cycle: BillingCycle) {
  if (monthly === 0) return 0
  const opt = BILLING_OPTIONS.find(o => o.key === cycle)!
  return Math.round(monthly * opt.months * opt.multiplier)
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) return {}

  return {
    Authorization: `Bearer ${session.access_token}`,
  }
}

export default function PlansPage() {
  const [currentPlan, setCurrentPlan] = useState('FREE')
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showAgreement, setShowAgreement] = useState(false)
  const [pendingPlan, setPendingPlan] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [showPendingModal, setShowPendingModal] = useState(false)

  useEffect(() => {
    async function loadUsage() {
      try {
        const authHeader = await getAuthHeader()

        const res = await fetch('/api/usage', {
          method: 'GET',
          headers: {
            ...authHeader,
          },
        })

        if (!res.ok) return

        const data = await res.json()

        if (data?.plan) {
          setCurrentPlan(data.plan)
        }
      } catch {
        // 避免 plans 頁因 usage 讀取失敗整頁中斷
      }
    }

    loadUsage()
  }, [])

  const handleApplyCoupon = () => {
    if (couponInput.trim().toUpperCase() === EARLY_BIRD_CODE) {
      setCouponApplied(true)
      setCouponError('')
    } else {
      setCouponApplied(false)
      setCouponError('折扣碼無效，請確認後再試')
    }
  }

  const getMonthly = (plan: typeof PLANS[0]) => {
    if (plan.normalMonthly === 0) return 0
    return couponApplied ? plan.earlybirdMonthly : plan.normalMonthly
  }

  const handleUpgradeClick = (planKey: string) => {
    if (planKey === 'FREE') return

    if (PLAN_LEVEL[planKey] <= PLAN_LEVEL[currentPlan]) {
      alert('無法購買低於或等於目前方案的訂閱')
      return
    }

    setPendingPlan(planKey)
    setShowAgreement(true)
  }

  const handleConfirmUpgrade = async () => {
    if (!agreed) return

    setShowAgreement(false)
    setSelectedPlan(pendingPlan)
    setLoading(true)

    try {
      const authHeader = await getAuthHeader()

      const res = await fetch('/api/ecpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          plan: pendingPlan,
          billingCycle: billing,
          couponCode: couponApplied ? EARLY_BIRD_CODE : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data?.error === '已有待付款訂單，請先完成付款或稍後再試') {
          setShowPendingModal(true)
        } else {
          alert(data?.error || '建立訂單失敗')
        }
        setLoading(false)
        return
      }

      if (!data?.paymentHtml) {
        alert('付款資料建立失敗')
        setLoading(false)
        return
      }

      const wrapper = document.createElement('div')
      wrapper.innerHTML = data.paymentHtml
      document.body.appendChild(wrapper)

      const form = wrapper.querySelector('form') as HTMLFormElement | null
      if (!form) {
        alert('付款表單建立失敗')
        setLoading(false)
        return
      }

      form.submit()
    } catch {
      alert('付款系統暫時無法使用，請稍後再試')
      setLoading(false)
    } finally {
      setAgreed(false)
    }
  }

  const selectedOpt = BILLING_OPTIONS.find(o => o.key === billing)!

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl font-black mb-3">選擇方案</h1>
        <p className="text-white/40">月繳、季繳、半年、年繳，怎麼划算怎麼選</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <label className="text-sm text-white/60 mb-2 block">有早鳥折扣碼嗎？</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={e => {
                  setCouponInput(e.target.value.toUpperCase())
                  setCouponError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                placeholder="輸入折扣碼"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500 w-48 uppercase"
              />
              <button
                onClick={handleApplyCoupon}
                className="bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                套用
              </button>
            </div>
            {couponError && <p className="text-red-400 text-xs mt-1.5">{couponError}</p>}
          </div>
          {couponApplied && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm font-medium">
              🎉 早鳥優惠已套用！
            </div>
          )}
        </div>
      </div>

      {/* 功能對照表 */}
      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <h3 className="font-bold text-lg mb-4">方案功能對照</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/60 border-b border-white/10">
              <th className="pb-3 pr-4">項目</th>
              <th className="pb-3 px-2 text-center">免費</th>
              <th className="pb-3 px-2 text-center">Creator</th>
              <th className="pb-3 px-2 text-center">專業版</th>
              <th className="pb-3 pl-2 text-center">旗艦版</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            <tr className="border-b border-white/5">
              <td className="py-3 pr-4">分析 + 生成次數 / 週期</td>
              <td className="py-3 px-2 text-center">3 + 3</td>
              <td className="py-3 px-2 text-center">50 + 50</td>
              <td className="py-3 px-2 text-center">200 + 200</td>
              <td className="py-3 pl-2 text-center">500 + 500</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 pr-4">每支影片可生成延伸腳本數</td>
              <td className="py-3 px-2 text-center">0</td>
              <td className="py-3 px-2 text-center">1 個</td>
              <td className="py-3 px-2 text-center">3 個</td>
              <td className="py-3 pl-2 text-center">3 個</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 pr-4">一鍵複製全部標題、匯出 .txt</td>
              <td className="py-3 px-2 text-center">—</td>
              <td className="py-3 px-2 text-center">—</td>
              <td className="py-3 px-2 text-center">✓</td>
              <td className="py-3 pl-2 text-center">✓</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          {BILLING_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setBilling(opt.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === opt.key ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {opt.label}
              {opt.discount && (
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    billing === opt.key ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {opt.discount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key
          const isLocked = PLAN_LEVEL[plan.key] <= PLAN_LEVEL[currentPlan]
          const monthly = getMonthly(plan)
          const total = calcTotal(monthly, billing)
          const normalTotal = calcTotal(plan.normalMonthly, billing)
          const isDiscounted = couponApplied && plan.normalMonthly > 0

          return (
            <div
              key={plan.key}
              className={`rounded-2xl p-8 relative flex flex-col ${
                plan.highlight ? 'bg-brand-500 ring-2 ring-brand-400' : 'glass'
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-black px-4 py-1 rounded-full ${
                    plan.highlight ? 'bg-white text-brand-600' : 'bg-brand-500 text-white'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">{plan.name}</h3>
                {plan.normalMonthly === 0 ? (
                  <div className="text-4xl font-black">NT$0</div>
                ) : (
                  <div>
                    {isDiscounted && (
                      <div
                        className={`text-xs line-through mb-1 ${
                          plan.highlight ? 'text-white/40' : 'text-white/30'
                        }`}
                      >
                        {billing === 'monthly'
                          ? `NT$${plan.normalMonthly.toLocaleString()}/月`
                          : `NT$${normalTotal.toLocaleString()}/${selectedOpt.months}個月`}
                      </div>
                    )}
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black">
                        NT${(billing === 'monthly' ? monthly : total).toLocaleString()}
                      </span>
                      <span className={`text-sm pb-1 ${plan.highlight ? 'text-white/70' : 'text-white/40'}`}>
                        {selectedOpt.months > 1 ? `/${selectedOpt.months}個月` : '/月'}
                      </span>
                    </div>
                    {selectedOpt.months > 1 && (
                      <div className={`text-xs mt-1 ${plan.highlight ? 'text-white/60' : 'text-white/40'}`}>
                        平均 NT${Math.round(total / selectedOpt.months).toLocaleString()}/月
                      </div>
                    )}
                    {isDiscounted && (
                      <div className="text-xs text-yellow-400 mt-1">🎉 早鳥折扣已套用</div>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li
                    key={f}
                    className={`text-sm flex items-start gap-2 ${
                      plan.highlight ? 'text-white/90' : 'text-white/60'
                    }`}
                  >
                    <span className="mt-0.5 text-green-400 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgradeClick(plan.key)}
                disabled={isCurrent || isLocked || plan.key === 'FREE' || loading}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  isCurrent || isLocked || plan.key === 'FREE'
                    ? 'bg-white/10 text-white/40 cursor-default'
                    : plan.highlight
                    ? 'bg-white text-brand-600 hover:bg-white/90 hover:scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                {isCurrent
                  ? '✓ 目前方案'
                  : isLocked
                  ? '不可購買'
                  : loading && selectedPlan === plan.key
                  ? '處理中...'
                  : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      <div className="glass rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-bold text-lg mb-1">旗艦版 · 500次 / 週期</div>
          <div className="text-white/50 text-sm">
            適合代操公司或重度創作者。月繳 NT$2,999
          </div>
        </div>
        <button
          onClick={() => handleUpgradeClick('FLAGSHIP')}
          disabled={PLAN_LEVEL['FLAGSHIP'] <= PLAN_LEVEL[currentPlan] || loading}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
            PLAN_LEVEL['FLAGSHIP'] <= PLAN_LEVEL[currentPlan]
              ? 'bg-white/10 text-white/40 cursor-default'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
        >
          {currentPlan === 'FLAGSHIP'
            ? '✓ 目前方案'
            : PLAN_LEVEL['FLAGSHIP'] <= PLAN_LEVEL[currentPlan]
            ? '不可購買'
            : loading && selectedPlan === 'FLAGSHIP'
            ? '處理中...'
            : FLAGSHIP.cta}
        </button>
      </div>

      <div className="glass rounded-2xl p-8">
        <h3 className="font-bold text-xl mb-6">常見問題</h3>
        <div className="space-y-5">
          {[
            { q: '可以隨時取消嗎？', a: '可以，訂閱可在任何時候取消，取消後仍可使用至當期結束。' },
            { q: '額度什麼時候重置？', a: '依你的訂閱週期，例如月繳則每月同一日重置；未使用完的次數不累計至下期。' },
            { q: 'Creator 不夠用可以升級嗎？', a: '可以，升級時只計算剩餘天數的差額，不需要重新購買整個方案。' },
            { q: '次數是怎麼計算的？', a: '分析與生成都會計入對應配額，系統依照你的訂閱週期計算。' },
            { q: '支援哪些付款方式？', a: '透過綠界科技金流，可選信用卡、ATM/網銀轉帳（虛擬帳號）、超商代碼等，依綠界頁面顯示為準。' },
            { q: '有退款政策嗎？', a: '本服務為數位內容，付款後即可立即使用。依消費者保護法第19條，數位內容一經提供即喪失鑑賞期退款權利，付款前請詳閱並確認同意。' },
          ].map(faq => (
            <div key={faq.q} className="border-b border-white/5 pb-5 last:border-0 last:pb-0">
              <h4 className="font-medium mb-1.5">{faq.q}</h4>
              <p className="text-white/50 text-sm leading-relaxed">{faq.a}</p>
              {faq.q === '有退款政策嗎？' && (
                <p className="text-white/50 text-sm mt-2">
                  <Link href="/refund" className="text-brand-400 hover:text-brand-300 transition-colors">完整退款政策說明 →</Link>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAgreement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <h3 className="font-bold text-xl mb-4">升級前請確認</h3>
            <div className="bg-white/5 rounded-xl p-4 text-sm text-white/70 leading-relaxed mb-6">
              本服務為數位內容服務，付款後即可立即開始使用。
              <br /><br />
              依據消費者保護法第19條第1項第6款，
              <strong className="text-white">數位內容一經提供，即喪失七天鑑賞期之退款權利</strong>，
              確認付款後不得以鑑賞期為由申請退款。
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-500"
              />
              <span className="text-sm text-white/70">
                我已閱讀並同意上述條款，確認付款後不適用鑑賞期退款
              </span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAgreement(false)
                  setAgreed(false)
                }}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white/60 font-medium text-sm hover:bg-white/15 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={!agreed}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                  agreed ? 'bg-brand-500 text-white hover:bg-brand-400' : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                確認升級
              </button>
            </div>
          </div>
        </div>
      )}

      {showPendingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <h3 className="font-bold text-xl mb-3">已有待付款訂單</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              您有一筆尚未完成的付款。請至<strong className="text-white">帳單頁</strong>：
            </p>
            <ul className="text-white/70 text-sm leading-relaxed mb-2 list-disc list-inside space-y-1">
              <li>點「<strong className="text-white">繼續付款</strong>」完成該筆訂單，或</li>
              <li>點「<strong className="text-white">取消付款</strong>」關閉該筆後，再回方案頁重新下單。</li>
            </ul>
            <p className="text-white/50 text-xs leading-relaxed mb-6">
              若您剛取消該筆訂單，請<strong>稍等 3～5 秒</strong>後關閉此視窗並<strong>重新整理方案頁</strong>（F5）再試。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPendingModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white/60 font-medium text-sm hover:bg-white/15 transition-colors"
              >
                關閉
              </button>
              <Link
                href="/billing"
                className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm text-center hover:bg-brand-400 transition-colors inline-flex items-center justify-center"
                onClick={() => setShowPendingModal(false)}
              >
                前往帳單頁
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}