"use client";

import { useEffect, useState } from "react";
import { AdminSectionCard } from "@/components/admin/AdminShell";
import { useAdminSession } from "@/components/admin/useAdminSession";

type RevenueData = {
  monthlyRevenue: number;
  monthlyOrderCount: number;
  planCounts: Record<string, number>;
  recentPayments: {
    id: string;
    plan: string;
    billingCycle: string;
    amount: number;
    paidAt: string | null;
    email: string | null;
    name: string | null;
  }[];
};

const PLAN_LABELS: Record<string, string> = {
  CREATOR: "Creator",
  PRO: "專業版",
  FLAGSHIP: "旗艦版",
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "月繳",
  quarterly: "季繳",
  biannual: "半年繳",
  annual: "年繳",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-TW");
}

export default function AdminRevenuePage() {
  const { token, isAdmin, loading: authLoading } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<RevenueData | null>(null);

  useEffect(() => {
    async function load() {
      if (!token || !isAdmin) return;
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/revenue", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error || "讀取收入資料失敗");
          return;
        }
        setData(json);
      } catch (err: any) {
        setError(err?.message || "讀取收入資料失敗");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, isAdmin]);

  return (
    <div className="space-y-6">
      <AdminSectionCard title="本月收入總覽">
        {authLoading || loading ? (
          <div className="text-white/50">讀取中...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
            {error}
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <p className="text-sm text-white/50 mb-1">本月收入總額</p>
              <p className="text-2xl font-black text-white">
                NT${data.monthlyRevenue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <p className="text-sm text-white/50 mb-1">本月訂單數</p>
              <p className="text-2xl font-black text-white">
                {data.monthlyOrderCount}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <p className="text-sm text-white/50 mb-1">各方案付費人數</p>
              <div className="space-y-1 mt-2">
                {Object.entries(data.planCounts).length === 0 ? (
                  <p className="text-white/40 text-sm">本月暫無付費</p>
                ) : (
                  Object.entries(data.planCounts).map(([plan, count]) => (
                    <div
                      key={plan}
                      className="flex justify-between text-sm text-white/70"
                    >
                      <span>{PLAN_LABELS[plan] || plan}</span>
                      <span className="font-semibold text-white">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard
        title="最近 10 筆付款"
        subtitle="依付款時間由近到遠排列"
      >
        {authLoading || loading ? (
          <div className="text-white/50">讀取中...</div>
        ) : error ? null : !data || data.recentPayments.length === 0 ? (
          <div className="text-white/50">暫無付款記錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/45">
                  <th className="px-3 py-3">使用者</th>
                  <th className="px-3 py-3">方案</th>
                  <th className="px-3 py-3">週期</th>
                  <th className="px-3 py-3">金額</th>
                  <th className="px-3 py-3">付款時間</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-white/5 align-top"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">
                        {p.name || "未命名"}
                      </div>
                      <div className="text-white/50 text-xs">
                        {p.email || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/70">
                      {PLAN_LABELS[p.plan?.toUpperCase()] || p.plan}
                    </td>
                    <td className="px-3 py-3 text-white/70">
                      {CYCLE_LABELS[p.billingCycle] || p.billingCycle}
                    </td>
                    <td className="px-3 py-3 font-semibold text-white">
                      NT${p.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-white/70">
                      {formatDate(p.paidAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
