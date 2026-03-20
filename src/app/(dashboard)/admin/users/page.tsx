"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminSectionCard } from "@/components/admin/AdminShell";
import { useAdminSession } from "@/components/admin/useAdminSession";

type UserListItem = {
  id: string;
  supabaseId: string;
  email: string | null;
  name: string | null;
  instagramHandle: string | null;
  role: string | null;
  accountStatus: string | null;
  createdAt: string;
  plan: string;
  subscriptionStatus: string;
  billingCycle: string | null;
  lastPaymentAt: string | null;
  lastPaymentStatus: string | null;
  lastPaymentAmount: number;
  lastUsageAt: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "無";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "無";
  return date.toLocaleString("zh-TW");
}

function formatAmount(value?: number | null) {
  if (!value) return "無";
  return `NT$${value}`;
}

export default function AdminUsersPage() {
  const { token, isAdmin, loading: authLoading } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<UserListItem[]>([]);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    q: "",
    plan: "",
    subscriptionStatus: "",
    accountStatus: "",
    role: "",
    createdFrom: "",
    createdTo: "",
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("limit", "150");
    return params.toString();
  }, [filters]);

  useEffect(() => {
    async function load() {
      if (!token || !isAdmin) return;

      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/admin/users?${queryString}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json?.error || "讀取使用者清單失敗");
          return;
        }

        setItems(Array.isArray(json?.items) ? json.items : []);
      } catch (err: any) {
        setError(err?.message || "讀取使用者清單失敗");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [queryString, token, isAdmin]);

  async function handleToggleSuspend(item: UserListItem) {
    if (!token) return;
    const isSuspended = item.accountStatus === "SUSPENDED";
    const action = isSuspended ? "ACTIVATE" : "SUSPEND";
    const confirmMsg = isSuspended
      ? `確定要啟用 ${item.email || item.name || "此使用者"} 的帳號嗎？`
      : `確定要停用 ${item.email || item.name || "此使用者"} 的帳號嗎？`;
    if (!window.confirm(confirmMsg)) return;

    setSuspendingId(item.supabaseId);
    try {
      const res = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ supabaseId: item.supabaseId, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error || "操作失敗");
        return;
      }
      setItems((prev) =>
        prev.map((u) =>
          u.supabaseId === item.supabaseId
            ? { ...u, accountStatus: json.accountStatus }
            : u
        )
      );
    } catch {
      alert("操作失敗，請稍後再試");
    } finally {
      setSuspendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title="搜尋與篩選"
        subtitle="支援 email、姓名、IG、Supabase ID 搜尋，並可依方案、訂閱狀態、帳號狀態快速切換。"
      >
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <input
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="搜尋 email / 姓名 / IG / supabaseId"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
          />
          <select
            value={filters.plan}
            onChange={(e) => setFilters((prev) => ({ ...prev, plan: e.target.value }))}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
          >
            <option value="">全部方案</option>
            <option value="FREE">FREE</option>
            <option value="CREATOR">CREATOR</option>
            <option value="PRO">PRO</option>
            <option value="FLAGSHIP">FLAGSHIP</option>
          </select>
          <select
            value={filters.subscriptionStatus}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                subscriptionStatus: e.target.value,
              }))
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
          >
            <option value="">全部訂閱狀態</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="FREE">FREE</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <select
            value={filters.accountStatus}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                accountStatus: e.target.value,
              }))
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
          >
            <option value="">全部帳號狀態</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <select
            value={filters.role}
            onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
          >
            <option value="">全部角色</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <input
            type="date"
            value={filters.createdFrom}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, createdFrom: e.target.value }))
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
          />
          <input
            type="date"
            value={filters.createdTo}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, createdTo: e.target.value }))
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() =>
              setFilters({
                q: "",
                plan: "",
                subscriptionStatus: "",
                accountStatus: "",
                role: "",
                createdFrom: "",
                createdTo: "",
              })
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            清空條件
          </button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="使用者清單"
        subtitle="點進去可看方案、付款、用量、內容活動、客服備註與人工調整紀錄。"
      >
        {authLoading || loading ? (
          <div className="text-white/50">讀取中...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-white/50">找不到符合條件的使用者。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/45">
                  <th className="px-3 py-3">使用者</th>
                  <th className="px-3 py-3">IG</th>
                  <th className="px-3 py-3">方案</th>
                  <th className="px-3 py-3">訂閱狀態</th>
                  <th className="px-3 py-3">帳號狀態</th>
                  <th className="px-3 py-3">操作</th>
                  <th className="px-3 py-3">角色</th>
                  <th className="px-3 py-3">最近付款</th>
                  <th className="px-3 py-3">最近使用</th>
                  <th className="px-3 py-3">註冊時間</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.supabaseId} className="border-b border-white/5 align-top">
                    <td className="px-3 py-4">
                      <div className="font-semibold text-white">
                        <Link
                          href={`/admin/users/${encodeURIComponent(item.supabaseId)}`}
                          className="hover:text-brand-300"
                        >
                          {item.name || item.email || "未命名使用者"}
                        </Link>
                      </div>
                      <div className="text-white/55">{item.email || "無 email"}</div>
                      <div className="text-xs text-white/35 break-all mt-1">
                        {item.supabaseId}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-white/70">
                      {item.instagramHandle ? `@${item.instagramHandle}` : "無"}
                    </td>
                    <td className="px-3 py-4 font-semibold">{item.plan}</td>
                    <td className="px-3 py-4 text-white/70">
                      {item.subscriptionStatus}
                      {item.billingCycle ? (
                        <div className="text-xs text-white/35">{item.billingCycle}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.accountStatus === "SUSPENDED"
                            ? "bg-red-500/20 text-red-200"
                            : "bg-emerald-500/20 text-emerald-200"
                        }`}
                      >
                        {item.accountStatus || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(item)}
                        disabled={suspendingId === item.supabaseId}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          item.accountStatus === "SUSPENDED"
                            ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                            : "bg-red-500/20 text-red-200 hover:bg-red-500/30"
                        }`}
                      >
                        {suspendingId === item.supabaseId
                          ? "處理中..."
                          : item.accountStatus === "SUSPENDED"
                          ? "啟用"
                          : "停用"}
                      </button>
                    </td>
                    <td className="px-3 py-4 text-white/70">{item.role || "USER"}</td>
                    <td className="px-3 py-4 text-white/70">
                      <div>{formatDate(item.lastPaymentAt)}</div>
                      <div className="text-xs text-white/35">
                        {item.lastPaymentStatus || "無"} / {formatAmount(item.lastPaymentAmount)}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-white/70">
                      {formatDate(item.lastUsageAt)}
                    </td>
                    <td className="px-3 py-4 text-white/70">
                      {formatDate(item.createdAt)}
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
