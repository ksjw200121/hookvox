"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const PLAN_LABELS: Record<string, string> = {
  FREE: "免費方案",
  CREATOR: "Creator 方案",
  PRO: "專業版方案",
  FLAGSHIP: "旗艦版方案",
};

const PLAN_PRICES: Record<string, string> = {
  FREE: "NT$0 / 月",
  CREATOR: "NT$699 / 月",
  PRO: "NT$1,599 / 月",
  FLAGSHIP: "NT$2,999 / 月",
};

type OrderRow = {
  id: string;
  plan: string;
  planLabel: string;
  billingCycle: string;
  cycleLabel: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  merchantTradeNo: string | null;
};

type SubscriptionState = {
  plan: string;
  planLabel: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

type UsageState = {
  analyze: { used: number; limit: number; remaining: number };
  generate: { used: number; limit: number; remaining: number };
  cycleEnd: string | null;
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [continuingId, setContinuingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setSubscription({
          plan: "FREE",
          planLabel: PLAN_LABELS.FREE,
          status: "FREE",
          startDate: null,
          endDate: null,
        });
        setOrders([]);
        setUsage(null);
        setLoading(false);
        return;
      }

      const [billingRes, usageRes] = await Promise.all([
        fetch("/api/billing", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/usage", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const billingData = await billingRes.json();
      const usageData = await usageRes.json();

      if (!billingRes.ok) {
        setError(billingData?.error || "無法載入帳單");
        return;
      }

      setSubscription(billingData.subscription || null);
      setOrders(billingData.orders || []);

      if (usageRes.ok && usageData?.usage) {
        setUsage({
          analyze: {
            used: usageData.usage.analyze?.used ?? 0,
            limit: usageData.usage.analyze?.limit ?? 0,
            remaining: usageData.usage.analyze?.remaining ?? 0,
          },
          generate: {
            used: usageData.usage.generate?.used ?? 0,
            limit: usageData.usage.generate?.limit ?? 0,
            remaining: usageData.usage.generate?.remaining ?? 0,
          },
          cycleEnd: usageData.usage.analyze?.cycleEnd ?? null,
        });
      } else {
        setUsage(null);
      }
    } catch (e) {
      setError("載入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const onVisible = () => loadData();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const isPaid = subscription?.status === "ACTIVE";
  const isExpired = subscription?.status === "EXPIRED";

  async function handleContinuePayment(order: OrderRow) {
    if (order.status !== "PENDING" || !order.merchantTradeNo) return;
    setContinuingId(order.id);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("請先登入");
        return;
      }
      const res = await fetch("/api/ecpay/continue-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ merchantTradeNo: order.merchantTradeNo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "無法取得付款頁");
        return;
      }
      if (!data?.paymentHtml) {
        setError("付款資料建立失敗");
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.innerHTML = data.paymentHtml;
      document.body.appendChild(wrapper);
      const form = wrapper.querySelector("form") as HTMLFormElement | null;
      if (form) form.submit();
    } catch {
      setError("付款系統暫時無法使用，請稍後再試");
    } finally {
      setContinuingId(null);
    }
  }

  async function handleCancelPayment(order: OrderRow) {
    if (order.status !== "PENDING" || !order.merchantTradeNo) return;
    setCancellingId(order.id);
    setError("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("請先登入");
        return;
      }
      const res = await fetch("/api/ecpay/cancel-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ merchantTradeNo: order.merchantTradeNo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "取消訂單失敗");
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: "CANCELLED" } : o
        )
      );
      const billingRes = await fetch("/api/billing", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const billingData = await billingRes.json();
      if (billingRes.ok) {
        setSubscription(billingData.subscription || null);
        setOrders(billingData.orders || []);
      }
    } catch {
      setError("取消訂單時發生錯誤，請稍後再試");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black mb-2">帳單</h1>
        <p className="text-white/40">
          目前方案、計費週期與付款記錄。到期後額度會重置；若續訂同方案則收方案全額。
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* 目前方案與週期 */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4">目前方案</h2>
        {loading ? (
          <div className="h-20 shimmer rounded-xl" />
        ) : subscription ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xl font-black mb-1">
                {subscription.planLabel}
              </div>
              <div className="text-white/40 text-sm mb-2">
                {PLAN_PRICES[subscription.plan] ?? "—"}
              </div>
              {subscription.startDate && subscription.endDate && (
                <div className="text-sm text-white/50">
                  本期：{formatDate(subscription.startDate)} ～ {formatDate(subscription.endDate)}
                </div>
              )}
            </div>
            {subscription.plan === "FREE" ? (
              <Link
                href="/plans"
                className="bg-brand-500 hover:bg-brand-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors inline-block text-center"
              >
                升級方案
              </Link>
            ) : isExpired ? (
              <span className="text-amber-400 text-sm font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                已到期，可至方案頁重新訂閱
              </span>
            ) : (
              <span className="text-green-400 text-sm font-medium bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                訂閱中
              </span>
            )}
          </div>
        ) : (
          <div className="text-white/50 text-sm">免費方案</div>
        )}
      </div>

      {/* 本期使用額度 + 到期日 */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4">本期使用額度</h2>
        {loading ? (
          <div className="h-24 shimmer rounded-xl" />
        ) : usage ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-white/50 mb-1">爆款分析</p>
                <p className="text-lg font-bold text-white">
                  {usage.analyze.used} <span className="text-white/40 font-normal">/ {usage.analyze.limit}</span>
                </p>
                <p className="text-xs text-white/40 mt-1">剩餘 {usage.analyze.remaining} 次</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-white/50 mb-1">內容生成</p>
                <p className="text-lg font-bold text-white">
                  {usage.generate.used} <span className="text-white/40 font-normal">/ {usage.generate.limit}</span>
                </p>
                <p className="text-xs text-white/40 mt-1">剩餘 {usage.generate.remaining} 次</p>
              </div>
            </div>
            {(usage.cycleEnd || (subscription?.endDate && isPaid)) && (
              <div className="rounded-xl bg-brand-500/10 border border-brand-500/20 p-3 text-sm">
                <span className="text-white/60">本期到期日（下次續訂日）</span>
                <span className="ml-2 font-semibold text-white">
                  {formatDate(usage.cycleEnd ?? subscription?.endDate ?? null)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/40 text-sm">無法載入額度，請重新整理</p>
        )}
      </div>

      {/* 說明：到期重置與續訂全額 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 leading-relaxed">
        <p className="font-medium text-white/70 mb-1">計費說明</p>
        <ul className="list-disc list-inside space-y-1">
          <li>本期到期後，使用額度會重置；若繼續使用需至方案頁重新訂閱。</li>
          <li>續訂時依所選方案收取<strong className="text-white/80">方案全額</strong>（非差額）。</li>
          <li>本期內升級更高方案則只收差額，週期與已用次數不變。</li>
        </ul>
      </div>

      {/* 帳單記錄 */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-2">付款記錄</h2>
        <p className="text-white/40 text-sm mb-4">
          若有待付款訂單，請點擊「繼續付款」完成該筆付款；關掉付款頁後可隨時從這裡再次進入。若訂單有誤或無法付款，可點「取消付款」關閉該筆訂單後，至方案頁重新下單。
        </p>
        {loading ? (
          <div className="h-24 shimmer rounded-xl" />
        ) : orders.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-white/40 text-sm">尚無付款記錄</p>
            <Link
              href="/plans"
              className="text-brand-400 text-sm hover:underline mt-2 inline-block"
            >
              升級以開始使用付費功能
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {order.planLabel}
                    {order.cycleLabel && (
                      <span className="text-white/40 font-normal ml-1">
                        · {order.cycleLabel}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-white/35">
                    {order.paidAt
                      ? `付款於 ${formatDate(order.paidAt)}`
                      : `建立於 ${formatDate(order.createdAt)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    NT$ {order.amount.toLocaleString()}
                  </p>
                  {order.status === "PAID" ? (
                    <p className="text-xs text-green-400">已付款</p>
                  ) : order.status === "PENDING" ? (
                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleContinuePayment(order)}
                        disabled={!!continuingId || !!cancellingId || !order.merchantTradeNo}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {continuingId === order.id ? "處理中..." : "繼續付款"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelPayment(order)}
                        disabled={!!continuingId || !!cancellingId}
                        className="text-xs text-white/50 hover:text-white/70 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingId === order.id ? "取消中..." : "取消付款"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40">
                      {order.status === "CANCELLED" ? "已取消" : order.status}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 取消／不續訂說明 */}
      {isPaid && subscription && subscription.plan !== "FREE" && (
        <div className="glass rounded-2xl p-6 border border-white/5">
          <h2 className="font-bold mb-2 text-white/80">不續訂</h2>
          <p className="text-white/40 text-sm mb-3">
            本服務為訂閱制，無自動扣款。本期到期後若不至方案頁再次訂閱，將自動轉為免費方案，額度依免費方案計算。
          </p>
          <Link
            href="/plans"
            className="text-white/50 text-sm hover:text-white/70 transition-colors"
          >
            前往方案頁 →
          </Link>
        </div>
      )}
    </div>
  );
}
