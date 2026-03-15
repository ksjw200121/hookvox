"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WeekPoint = {
  date: string;
  analyzeCount: number;
  generateCount: number;
  estimatedCostUsd: number;
  hardLocked: boolean;
};

type TopUser = {
  userId: string;
  email: string;
  name: string;
  analyzeCount: number;
  generateCount: number;
  totalCount: number;
};

type OverviewData = {
  today: {
    date: string;
    analyzeCount: number;
    generateCount: number;
    estimatedCostUsd: number;
    hardLocked: boolean;
  };
  month: {
    analyzeCount: number;
    generateCount: number;
    estimatedCostUsd: number;
    hardLockedDays: number;
  };
  weekSeries: WeekPoint[];
  topUsers: TopUser[];
};

function formatUsd(value: number) {
  return `$${value.toFixed(4)}`;
}

function formatShortDate(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AdminCostsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<OverviewData | null>(null);
  const [aiSwitchLoading, setAiSwitchLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;

        if (!token) {
          setError("找不到登入 token");
          return;
        }

        const res = await fetch("/api/admin/cost-overview", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json?.error || "讀取管理數據失敗");
          return;
        }

        setData(json);
      } catch (err: any) {
        setError(err?.message || "讀取管理數據失敗");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function toggleAi(enabled: boolean) {
    try {
      setAiSwitchLoading(true);
      setError("");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setError("找不到登入 token");
        return;
      }

      const res = await fetch("/api/admin/toggle-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "切換 AI 狀態失敗");
        return;
      }

      alert(enabled ? "AI 已重新開啟" : "AI 已手動關閉");
    } catch (err: any) {
      setError(err?.message || "切換 AI 狀態失敗");
    } finally {
      setAiSwitchLoading(false);
    }
  }

  const maxCost = useMemo(() => {
    const values = data?.weekSeries?.map((item) => item.estimatedCostUsd) || [];
    return Math.max(...values, 0.01);
  }, [data]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-black mb-2">Admin 成本監控</h1>
        <p className="text-white/40">
          監控 Hookvox 今日 AI 成本、操作量、風險狀態與活躍使用者。
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-bold text-xl">AI 系統控制</div>
            <div className="text-sm text-white/40">
              可手動緊急關閉或重新開啟 AI，避免成本異常擴大。
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => toggleAi(false)}
              disabled={aiSwitchLoading}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
            >
              {aiSwitchLoading ? "處理中..." : "關閉 AI"}
            </button>

            <button
              onClick={() => toggleAi(true)}
              disabled={aiSwitchLoading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
            >
              {aiSwitchLoading ? "處理中..." : "開啟 AI"}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass rounded-2xl p-6 text-white/50">讀取中...</div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">今日 AI 成本</div>
              <div className="text-3xl font-black">
                {formatUsd(data.today.estimatedCostUsd)}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">今日分析次數</div>
              <div className="text-3xl font-black">{data.today.analyzeCount}</div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">今日生成次數</div>
              <div className="text-3xl font-black">{data.today.generateCount}</div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">成本熔斷狀態</div>
              <div
                className={`inline-flex px-3 py-2 rounded-xl text-sm font-bold ${
                  data.today.hardLocked
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {data.today.hardLocked ? "已啟動保護" : "正常"}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">本月累積成本</div>
              <div className="text-2xl font-black">
                {formatUsd(data.month.estimatedCostUsd)}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">本月累積分析次數</div>
              <div className="text-2xl font-black">{data.month.analyzeCount}</div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="text-sm text-white/40 mb-2">本月累積生成次數</div>
              <div className="text-2xl font-black">{data.month.generateCount}</div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-xl">最近 7 天成本趨勢</div>
                <div className="text-sm text-white/40">
                  用來快速發現成本異常或某天突然暴衝。
                </div>
              </div>
              <div className="text-sm text-white/50">
                本月觸發熔斷天數：{data.month.hardLockedDays}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3 items-end h-64">
              {data.weekSeries.map((item) => {
                const height = Math.max(
                  (item.estimatedCostUsd / maxCost) * 100,
                  item.estimatedCostUsd > 0 ? 8 : 0
                );

                return (
                  <div key={item.date} className="flex flex-col items-center gap-3">
                    <div className="text-xs text-white/40">
                      {formatUsd(item.estimatedCostUsd)}
                    </div>

                    <div className="w-full h-44 flex items-end">
                      <div
                        className={`w-full rounded-t-xl transition-all ${
                          item.hardLocked ? "bg-red-500" : "bg-brand-500"
                        }`}
                        style={{ height: `${height}%` }}
                        title={`${item.date} / ${formatUsd(item.estimatedCostUsd)}`}
                      />
                    </div>

                    <div className="text-xs text-white/50">
                      {formatShortDate(item.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div>
              <div className="font-bold text-xl">今日最活躍使用者</div>
              <div className="text-sm text-white/40">
                快速看誰在大量使用系統，方便追蹤異常或高價值客戶。
              </div>
            </div>

            {data.topUsers.length === 0 ? (
              <div className="text-white/50">今天還沒有使用紀錄。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/10">
                      <th className="py-3 pr-4">使用者</th>
                      <th className="py-3 pr-4">Email</th>
                      <th className="py-3 pr-4">分析</th>
                      <th className="py-3 pr-4">生成</th>
                      <th className="py-3 pr-4">總次數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((user) => (
                      <tr
                        key={user.userId}
                        className="border-b border-white/5 text-white/90"
                      >
                        <td className="py-3 pr-4">
                          {user.name || "未命名使用者"}
                        </td>
                        <td className="py-3 pr-4 text-white/60">
                          {user.email || "未提供"}
                        </td>
                        <td className="py-3 pr-4">{user.analyzeCount}</td>
                        <td className="py-3 pr-4">{user.generateCount}</td>
                        <td className="py-3 pr-4 font-bold">
                          {user.totalCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6 space-y-3">
            <div className="font-bold text-lg">你接下來可以怎麼看這頁</div>
            <div className="text-white/70 leading-relaxed">
              先觀察今天成本是不是符合你的預期。如果某一天突然暴衝，
              先去看最活躍使用者與當天生成次數，再決定要不要調低 rate limit
              或降低每日硬上限。
            </div>
          </div>
        </>
      )}
    </div>
  );
}