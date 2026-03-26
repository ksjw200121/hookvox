"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSectionCard } from "@/components/admin/AdminShell";
import { useAdminSession } from "@/components/admin/useAdminSession";

function fmtStatus(s?: string | null) {
  const map: Record<string, string> = {
    ACTIVE: "訂閱中", FREE: "免費", EXPIRED: "已到期", CANCELLED: "已取消", PENDING: "待付款",
  };
  return map[String(s || "").toUpperCase()] ?? s ?? "無";
}
function fmtAccountStatus(s?: string | null) {
  return String(s || "").toUpperCase() === "SUSPENDED" ? "已停用" : "使用中";
}
function fmtRole(s?: string | null) {
  return String(s || "").toUpperCase() === "ADMIN" ? "管理員" : "一般用戶";
}
function fmtCycle(s?: string | null) {
  const map: Record<string, string> = {
    monthly: "月繳", quarterly: "季繳", biannual: "半年繳", annual: "年繳",
  };
  return map[String(s || "").toLowerCase()] ?? s ?? "";
}
function fmtOrderStatus(s?: string | null) {
  const map: Record<string, string> = {
    PAID: "已付款", SUCCESS: "已付款", PENDING: "待付款",
    CANCELLED: "已取消", FAILED: "付款失敗",
  };
  return map[String(s || "").toUpperCase()] ?? s ?? "無";
}

type SummaryData = {
  user: {
    id: string;
    supabaseId: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    instagramHandle: string | null;
    accountStatus: string;
    internalNoteSummary: string | null;
    role: string | null;
    createdAt: string;
    updatedAt: string;
  };
  billing: {
    internalUserId: string | null;
    plan: string;
    accountStatus: string;
    status: string;
    billingCycle: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  usage: {
    plan: string;
    accountStatus?: string;
    usage: {
      analyze: {
        used: number;
        limit: number;
        remaining: number;
        cycleStart: string | null;
        cycleEnd: string | null;
        adjustment: number;
      };
      generate: {
        used: number;
        limit: number;
        remaining: number;
        cycleStart: string | null;
        cycleEnd: string | null;
        adjustment: number;
      };
      week: {
        analyze: number;
        generate: number;
      };
    };
  };
  orders: Array<{
    id: string;
    plan: string;
    billingCycle: string;
    amount: number;
    status: string;
    merchantTradeNo: string | null;
    tradeNo: string | null;
    paidAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  content: Array<{
    id: string;
    videoUrl: string | null;
    transcript: string | null;
    analysis: any;
    createdAt: string | null;
    isSaved: boolean;
    savedAt: string | null;
  }>;
  recentUsage: Array<{
    action: string;
    count: number;
  }>;
};

type NoteItem = {
  id: string;
  note: string;
  noteType: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorUser?: {
    email?: string | null;
    name?: string | null;
  };
};

type AuditItem = {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  reason: string | null;
  beforeJson: any;
  afterJson: any;
  metaJson: any;
  createdAt: string;
  actorUser?: {
    email?: string | null;
    name?: string | null;
  };
};

type AdjustmentItem = {
  id: string;
  feature: string;
  delta: number;
  reason: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  revokedAt: string | null;
  createdAt: string;
  actorUser?: {
    email?: string | null;
    name?: string | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "無";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "無";
  return date.toLocaleString("zh-TW");
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatAmount(value?: number | null) {
  return `NT$${Number(value || 0)}`;
}

function formatJsonPreview(value: any) {
  if (!value) return "無";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "無法預覽";
  }
}

function getContentTitle(item: SummaryData["content"][number]) {
  const analysis = item.analysis || {};
  return (
    analysis?.coreTopic ||
    analysis?.summary ||
    analysis?.hook ||
    item.videoUrl ||
    "未命名內容"
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: { supabaseId: string };
}) {
  const supabaseId = decodeURIComponent(params.supabaseId);
  const { token, isAdmin, loading: authLoading } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [profileForm, setProfileForm] = useState({
    role: "USER",
    accountStatus: "ACTIVE",
    instagramHandle: "",
    internalNoteSummary: "",
    reason: "",
  });
  const [noteForm, setNoteForm] = useState({
    note: "",
    noteType: "GENERAL",
    isPinned: false,
    reason: "",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    feature: "ANALYZE",
    delta: "10",
    reason: "",
    effectiveFrom: "",
    effectiveTo: "",
  });
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan: "FREE",
    status: "ACTIVE",
    billingCycle: "monthly",
    startDate: "",
    endDate: "",
    reason: "",
  });

  async function authorizedFetch(path: string, init?: RequestInit) {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "操作失敗");
    }

    return json;
  }

  async function loadAll() {
    if (!token || !isAdmin) return;

    try {
      setLoading(true);
      setError("");

      const [summaryJson, notesJson, auditJson, adjustmentJson] = await Promise.all([
        authorizedFetch(`/api/admin/users/${encodeURIComponent(supabaseId)}/summary`, {
          method: "GET",
        }),
        authorizedFetch(`/api/admin/users/${encodeURIComponent(supabaseId)}/notes`, {
          method: "GET",
        }),
        authorizedFetch(`/api/admin/users/${encodeURIComponent(supabaseId)}/audit`, {
          method: "GET",
        }),
        authorizedFetch(
          `/api/admin/users/${encodeURIComponent(supabaseId)}/quota-adjustments`,
          {
            method: "GET",
          }
        ),
      ]);

      setSummary(summaryJson);
      setNotes(Array.isArray(notesJson?.notes) ? notesJson.notes : []);
      setAuditLogs(Array.isArray(auditJson?.logs) ? auditJson.logs : []);
      setAdjustments(
        Array.isArray(adjustmentJson?.adjustments) ? adjustmentJson.adjustments : []
      );
    } catch (err: any) {
      setError(err?.message || "讀取使用者詳情失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [token, isAdmin, supabaseId]);

  useEffect(() => {
    if (!summary) return;
    setProfileForm({
      role: summary.user.role || "USER",
      accountStatus: summary.user.accountStatus || "ACTIVE",
      instagramHandle: summary.user.instagramHandle || "",
      internalNoteSummary: summary.user.internalNoteSummary || "",
      reason: "",
    });
    setSubscriptionForm({
      plan: summary.billing.plan || "FREE",
      status: summary.billing.status || "ACTIVE",
      billingCycle: summary.billing.billingCycle || "monthly",
      startDate: formatDateInput(summary.billing.startDate),
      endDate: formatDateInput(summary.billing.endDate),
      reason: "",
    });
  }, [summary]);

  const headline = useMemo(() => {
    if (!summary) return "";
    return summary.user.name || summary.user.email || summary.user.supabaseId;
  }, [summary]);

  async function handleProfileSave() {
    try {
      setSavingProfile(true);
      await authorizedFetch(
        `/api/admin/users/${encodeURIComponent(supabaseId)}/update-profile`,
        {
          method: "POST",
          body: JSON.stringify(profileForm),
        }
      );
      await loadAll();
    } catch (err: any) {
      alert(err?.message || "更新使用者資料失敗");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateNote() {
    try {
      setSavingNote(true);
      await authorizedFetch(`/api/admin/users/${encodeURIComponent(supabaseId)}/notes`, {
        method: "POST",
        body: JSON.stringify(noteForm),
      });
      setNoteForm({
        note: "",
        noteType: "GENERAL",
        isPinned: false,
        reason: "",
      });
      await loadAll();
    } catch (err: any) {
      alert(err?.message || "新增備註失敗");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm("確定要刪除這則備註嗎？")) return;

    try {
      await authorizedFetch(
        `/api/admin/users/${encodeURIComponent(supabaseId)}/notes/${noteId}`,
        {
          method: "DELETE",
        }
      );
      await loadAll();
    } catch (err: any) {
      alert(err?.message || "刪除備註失敗");
    }
  }

  async function handleAdjustmentCreate() {
    try {
      setSavingAdjustment(true);
      await authorizedFetch(
        `/api/admin/users/${encodeURIComponent(supabaseId)}/quota-adjustments`,
        {
          method: "POST",
          body: JSON.stringify({
            feature: adjustmentForm.feature,
            delta: Number(adjustmentForm.delta),
            reason: adjustmentForm.reason,
            effectiveFrom: adjustmentForm.effectiveFrom || undefined,
            effectiveTo: adjustmentForm.effectiveTo || undefined,
          }),
        }
      );
      setAdjustmentForm({
        feature: "ANALYZE",
        delta: "10",
        reason: "",
        effectiveFrom: "",
        effectiveTo: "",
      });
      await loadAll();
    } catch (err: any) {
      alert(err?.message || "新增額度調整失敗");
    } finally {
      setSavingAdjustment(false);
    }
  }

  async function handleAdjustmentRevoke(adjustmentId: string) {
    if (!window.confirm("確定要撤銷這筆額度調整嗎？")) return;

    try {
      await authorizedFetch(
        `/api/admin/users/${encodeURIComponent(
          supabaseId
        )}/quota-adjustments/${adjustmentId}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      await loadAll();
    } catch (err: any) {
      alert(err?.message || "撤銷額度調整失敗");
    }
  }

  async function handleSubscriptionAction(action: string) {
    if (
      (action === "set_free_expired" &&
        !window.confirm("確定要把這個帳號改成免費/到期狀態嗎？")) ||
      (action === "sync_latest_paid_order" &&
        !window.confirm("確定要用最近已付款訂單重新同步訂閱嗎？"))
    ) {
      return;
    }

    try {
      setSavingSubscription(true);
      const json = await authorizedFetch(
        `/api/admin/users/${encodeURIComponent(supabaseId)}/subscription-tools`,
        {
          method: "POST",
          body: JSON.stringify({
            action,
            reason: subscriptionForm.reason,
          }),
        }
      );
      if (json?.warning) {
        alert(json.warning);
      }
      await loadAll();
    } catch (err: any) {
      alert(err?.message || "訂閱工具操作失敗");
    } finally {
      setSavingSubscription(false);
    }
  }

  async function handleReplaceSubscription() {
    if (!window.confirm("確定要手動覆蓋這個使用者的訂閱區間嗎？")) return;

    try {
      setSavingSubscription(true);
      const json = await authorizedFetch(
        `/api/admin/users/${encodeURIComponent(supabaseId)}/subscription-tools`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "replace_subscription_window",
            ...subscriptionForm,
          }),
        }
      );
      if (json?.warning) {
        alert(json.warning);
      }
      await loadAll();
    } catch (err: any) {
      alert(err?.message || "手動訂閱修正失敗");
    } finally {
      setSavingSubscription(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="glass rounded-2xl p-6 text-white/50">讀取使用者詳情中...</div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
        {error || "找不到使用者"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionCard
        title={headline}
        subtitle="這頁整合基本資料、方案、付款、用量、內容活動、客服備註、額度與訂閱人工修復工具。"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/40">Email</div>
            <div className="mt-2 break-all font-semibold">
              {summary.user.email || "無"}
            </div>
            <div className="mt-2 text-xs text-white/35">{summary.user.supabaseId}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/40">方案 / 狀態</div>
            <div className="mt-2 text-lg font-black">
              {summary.billing.plan} / {fmtStatus(summary.billing.status)}
            </div>
            <div className="mt-2 text-xs text-white/35">
              {fmtCycle(summary.billing.billingCycle) || "無週期"}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/40">帳號狀態 / 角色</div>
            <div className="mt-2 text-lg font-black">
              {fmtAccountStatus(summary.user.accountStatus)} / {fmtRole(summary.user.role)}
            </div>
            <div className="mt-2 text-xs text-white/35">
              註冊：{formatDate(summary.user.createdAt)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/40">近 7 天使用</div>
            <div className="mt-2 text-lg font-black">
              分析 {summary.usage.usage.week.analyze} / 生成{" "}
              {summary.usage.usage.week.generate}
            </div>
            <div className="mt-2 text-xs text-white/35">
              最近訂單 {summary.orders.length} 筆
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="基本資料與安全管控">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={profileForm.role}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, role: e.target.value }))}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"
            >
              <option value="USER">一般用戶</option>
              <option value="ADMIN">管理員</option>
            </select>
            <select
              value={profileForm.accountStatus}
              onChange={(e) =>
                setProfileForm((prev) => ({
                  ...prev,
                  accountStatus: e.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"
            >
              <option value="ACTIVE">使用中</option>
              <option value="SUSPENDED">已停用</option>
            </select>
            <input
              value={profileForm.instagramHandle}
              onChange={(e) =>
                setProfileForm((prev) => ({
                  ...prev,
                  instagramHandle: e.target.value,
                }))
              }
              placeholder="IG 帳號"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              value={profileForm.reason}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="這次修改原因"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
          </div>
          <textarea
            value={profileForm.internalNoteSummary}
            onChange={(e) =>
              setProfileForm((prev) => ({
                ...prev,
                internalNoteSummary: e.target.value,
              }))
            }
            placeholder="客服摘要 / 風險提示 / 重點備忘"
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={savingProfile}
            className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
          >
            {savingProfile ? "儲存中..." : "儲存基本資料"}
          </button>
        </AdminSectionCard>

        <AdminSectionCard title="方案與用量快照">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/40">分析次數</div>
              <div className="mt-2 text-2xl font-black">
                {summary.usage.usage.analyze.used} / {summary.usage.usage.analyze.limit}
              </div>
              <div className="mt-2 text-sm text-white/55">
                剩餘 {summary.usage.usage.analyze.remaining}，手動調整{" "}
                {summary.usage.usage.analyze.adjustment >= 0 ? "+" : ""}
                {summary.usage.usage.analyze.adjustment}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/40">生成次數</div>
              <div className="mt-2 text-2xl font-black">
                {summary.usage.usage.generate.used} / {summary.usage.usage.generate.limit}
              </div>
              <div className="mt-2 text-sm text-white/55">
                剩餘 {summary.usage.usage.generate.remaining}，手動調整{" "}
                {summary.usage.usage.generate.adjustment >= 0 ? "+" : ""}
                {summary.usage.usage.generate.adjustment}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            本期區間：{formatDate(summary.usage.usage.analyze.cycleStart)} 至{" "}
            {formatDate(summary.usage.usage.analyze.cycleEnd)}
            <br />
            訂閱區間：{formatDate(summary.billing.startDate)} 至{" "}
            {formatDate(summary.billing.endDate)}
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="付款記錄">
        {summary.orders.length === 0 ? (
          <div className="text-white/50">尚無付款紀錄。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/45">
                  <th className="px-3 py-3">方案</th>
                  <th className="px-3 py-3">金額</th>
                  <th className="px-3 py-3">狀態</th>
                  <th className="px-3 py-3">付款時間</th>
                  <th className="px-3 py-3">訂單編號</th>
                </tr>
              </thead>
              <tbody>
                {summary.orders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5 align-top">
                    <td className="px-3 py-4">
                      {order.plan}
                      <div className="text-xs text-white/35">{fmtCycle(order.billingCycle)}</div>
                    </td>
                    <td className="px-3 py-4">{formatAmount(order.amount)}</td>
                    <td className="px-3 py-4">{fmtOrderStatus(order.status)}</td>
                    <td className="px-3 py-4">{formatDate(order.paidAt || order.createdAt)}</td>
                    <td className="px-3 py-4 text-xs text-white/45">
                      <div>{order.merchantTradeNo || "無"}</div>
                      <div>{order.tradeNo || "無"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="內容活動">
          {summary.content.length === 0 ? (
            <div className="text-white/50">尚無內容活動。</div>
          ) : (
            <div className="space-y-3">
              {summary.content.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="font-semibold">{getContentTitle(item)}</div>
                  <div className="mt-2 text-xs text-white/35">
                    建立於 {formatDate(item.createdAt)}
                    {item.isSaved ? " / 已收藏" : ""}
                  </div>
                  {item.videoUrl ? (
                    <div className="mt-2 break-all text-sm text-white/60">{item.videoUrl}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard title="最近 7 天使用動作">
          {summary.recentUsage.length === 0 ? (
            <div className="text-white/50">最近 7 天沒有使用紀錄。</div>
          ) : (
            <div className="space-y-3">
              {summary.recentUsage.map((item) => (
                <div
                  key={item.action}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                >
                  <span>{item.action}</span>
                  <span className="font-black">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="客服備註">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={noteForm.noteType}
              onChange={(e) => setNoteForm((prev) => ({ ...prev, noteType: e.target.value }))}
              placeholder="GENERAL / PAYMENT / RISK"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={noteForm.isPinned}
                onChange={(e) =>
                  setNoteForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                }
              />
              置頂
            </label>
            <input
              value={noteForm.reason}
              onChange={(e) => setNoteForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="新增原因"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
          </div>
          <textarea
            value={noteForm.note}
            onChange={(e) => setNoteForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="輸入客服備註..."
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={handleCreateNote}
            disabled={savingNote}
            className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
          >
            {savingNote ? "新增中..." : "新增備註"}
          </button>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="text-white/50">還沒有備註。</div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {note.noteType}
                        {note.isPinned ? " / 置頂" : ""}
                      </div>
                      <div className="mt-1 text-xs text-white/35">
                        {note.authorUser?.name || note.authorUser?.email || "管理員"} /{" "}
                        {formatDate(note.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-xs text-red-200 hover:text-red-100"
                    >
                      刪除
                    </button>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-white/80">
                    {note.note}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="審計紀錄">
          {auditLogs.length === 0 ? (
            <div className="text-white/50">尚無審計紀錄。</div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{log.action}</div>
                    <div className="text-xs text-white/35">{formatDate(log.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-white/55">
                    {log.actorUser?.name || log.actorUser?.email || "管理員"} /{" "}
                    {log.entityType}
                  </div>
                  {log.reason ? (
                    <div className="mt-2 text-sm text-white/80">原因：{log.reason}</div>
                  ) : null}
                  <details className="mt-3 text-xs text-white/55">
                    <summary className="cursor-pointer">查看 before / after</summary>
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-black/40 p-3 whitespace-pre-wrap">
                      before:
                      {"\n"}
                      {formatJsonPreview(log.beforeJson)}
                      {"\n\n"}after:
                      {"\n"}
                      {formatJsonPreview(log.afterJson)}
                      {"\n\n"}meta:
                      {"\n"}
                      {formatJsonPreview(log.metaJson)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="人工額度調整">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={adjustmentForm.feature}
              onChange={(e) =>
                setAdjustmentForm((prev) => ({ ...prev, feature: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"
            >
              <option value="ANALYZE">ANALYZE</option>
              <option value="GENERATE">GENERATE</option>
            </select>
            <input
              value={adjustmentForm.delta}
              onChange={(e) =>
                setAdjustmentForm((prev) => ({ ...prev, delta: e.target.value }))
              }
              placeholder="delta，例如 10 或 -5"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              type="datetime-local"
              value={adjustmentForm.effectiveFrom}
              onChange={(e) =>
                setAdjustmentForm((prev) => ({
                  ...prev,
                  effectiveFrom: e.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              type="datetime-local"
              value={adjustmentForm.effectiveTo}
              onChange={(e) =>
                setAdjustmentForm((prev) => ({
                  ...prev,
                  effectiveTo: e.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
          </div>
          <textarea
            value={adjustmentForm.reason}
            onChange={(e) =>
              setAdjustmentForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="調整原因"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={handleAdjustmentCreate}
            disabled={savingAdjustment}
            className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
          >
            {savingAdjustment ? "送出中..." : "新增額度調整"}
          </button>

          <div className="space-y-3">
            {adjustments.length === 0 ? (
              <div className="text-white/50">尚無額度調整。</div>
            ) : (
              adjustments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {item.feature} {item.delta >= 0 ? "+" : ""}
                      {item.delta}
                    </div>
                    {!item.revokedAt ? (
                      <button
                        type="button"
                        onClick={() => handleAdjustmentRevoke(item.id)}
                        className="text-xs text-red-200 hover:text-red-100"
                      >
                        撤銷
                      </button>
                    ) : (
                      <span className="text-xs text-red-200">已撤銷</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-white/80">{item.reason}</div>
                  <div className="mt-2 text-xs text-white/35">
                    {item.actorUser?.name || item.actorUser?.email || "管理員"} / 生效{" "}
                    {formatDate(item.effectiveFrom)} 至 {formatDate(item.effectiveTo)}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="訂閱修復工具">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => handleSubscriptionAction("sync_latest_paid_order")}
              disabled={savingSubscription}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
            >
              用最近已付款訂單重新同步
            </button>
            <button
              type="button"
              onClick={() => handleSubscriptionAction("set_free_expired")}
              disabled={savingSubscription}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
            >
              改成免費 / 已到期
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={subscriptionForm.plan}
              onChange={(e) =>
                setSubscriptionForm((prev) => ({ ...prev, plan: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"
            >
              <option value="FREE">FREE</option>
              <option value="CREATOR">CREATOR</option>
              <option value="PRO">PRO</option>
              <option value="FLAGSHIP">FLAGSHIP</option>
            </select>
            <select
              value={subscriptionForm.status}
              onChange={(e) =>
                setSubscriptionForm((prev) => ({ ...prev, status: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"
            >
              <option value="ACTIVE">訂閱中</option>
              <option value="CANCELLED">已取消</option>
              <option value="EXPIRED">已到期</option>
            </select>
            <select
              value={subscriptionForm.billingCycle}
              onChange={(e) =>
                setSubscriptionForm((prev) => ({
                  ...prev,
                  billingCycle: e.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"
            >
              <option value="monthly">月繳</option>
              <option value="quarterly">季繳</option>
              <option value="biannual">半年繳</option>
              <option value="annual">年繳</option>
            </select>
            <input
              value={subscriptionForm.reason}
              onChange={(e) =>
                setSubscriptionForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="修正原因"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              type="datetime-local"
              value={subscriptionForm.startDate}
              onChange={(e) =>
                setSubscriptionForm((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <input
              type="datetime-local"
              value={subscriptionForm.endDate}
              onChange={(e) =>
                setSubscriptionForm((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleReplaceSubscription}
            disabled={savingSubscription}
            className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
          >
            {savingSubscription ? "處理中..." : "手動覆蓋訂閱區間"}
          </button>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            若帳號仍有未過期的已付款訂單，前台讀取方案時可能再次依最近付款自動同步。這種情況建議先看付款紀錄，再決定是同步付款結果還是手動測試到期狀態。
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
