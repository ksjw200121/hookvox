"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/client";

interface ContactMsg {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "一般",
  BUG: "Bug",
  BILLING: "帳單",
  FEATURE: "功能建議",
  OTHER: "其他",
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/admin/messages?filter=${filter}&page=${page}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setMessages(json.messages || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } catch (e) {
      console.error("Load messages error:", e);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function toggleRead(msg: ContactMsg) {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: msg.id, isRead: !msg.isRead }),
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: !m.isRead } : m))
      );
    } catch (e) {
      console.error("Toggle read error:", e);
    }
  }

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-black">用戶留言（{total}）</h2>
          <div className="flex gap-2">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  filter === f
                    ? "bg-brand-500 text-white"
                    : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {f === "all" ? "全部" : "未讀"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-6 text-white/50 animate-pulse">
            載入中...
          </div>
        ) : messages.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-white/50">
            {filter === "unread" ? "沒有未讀留言" : "目前沒有留言"}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`glass rounded-2xl p-5 border transition ${
                  msg.isRead ? "border-white/5" : "border-brand-500/30 bg-brand-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {!msg.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                      )}
                      <span className="font-bold">{msg.name}</span>
                      <span className="text-white/40 text-sm">{msg.email}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                        {CATEGORY_LABELS[msg.category] || msg.category}
                      </span>
                    </div>
                    <div className="text-xs text-white/30 mt-1">
                      {new Date(msg.createdAt).toLocaleString("zh-TW")}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleRead(msg)}
                    className="text-xs px-3 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition shrink-0"
                  >
                    {msg.isRead ? "標為未讀" : "標為已讀"}
                  </button>
                </div>

                {expandedId === msg.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 text-white/80 leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10 transition"
            >
              上一頁
            </button>
            <span className="text-sm text-white/50">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10 transition"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
