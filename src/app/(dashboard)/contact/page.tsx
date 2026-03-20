"use client";

import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
  { value: "GENERAL", label: "一般問題" },
  { value: "BUG", label: "Bug 回報" },
  { value: "BILLING", label: "帳單/付款" },
  { value: "FEATURE", label: "功能建議" },
  { value: "OTHER", label: "其他" },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "GENERAL",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg("請填寫所有必填欄位");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "送出失敗");
        setStatus("error");
        return;
      }

      setStatus("sent");
      setForm({ name: "", email: "", category: "GENERAL", message: "" });
    } catch {
      setErrorMsg("網路錯誤，請稍後再試");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black mb-2">聯繫我們</h1>
        <p className="text-white/40">
          訂閱、付款、功能問題都歡迎透過以下方式聯絡我們，我們會盡快回覆。
        </p>
      </div>

      {/* 直接聯繫方式 */}
      <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white/50 mb-1">信箱</h2>
          <a
            href="mailto:ksjw200121@gmail.com"
            className="text-brand-400 hover:text-brand-300 transition-colors break-all font-medium"
          >
            ksjw200121@gmail.com
          </a>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white/50 mb-1">Instagram</h2>
          <a
            href="https://www.instagram.com/fang.0721/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            @fang.0721
          </a>
        </div>
      </div>

      {/* 留言表單 */}
      <div className="glass rounded-2xl p-8 border border-white/10">
        <h2 className="text-xl font-bold mb-6">留言給我們</h2>

        {status === "sent" ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">✅</div>
            <h3 className="text-xl font-bold">訊息已送出！</h3>
            <p className="text-white/60">我們會在 1～3 個工作天內回覆你的信箱。</p>
            <button
              onClick={() => setStatus("idle")}
              className="text-brand-400 hover:text-brand-300 text-sm font-medium"
            >
              再送一則訊息
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">
                  姓名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="你的名字"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500 transition-colors"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">問題類型</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-gray-900">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">
                訊息內容 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="請描述你的問題或建議..."
                rows={5}
                maxLength={2000}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
              <div className="text-right text-xs text-white/30 mt-1">
                {form.message.length}/2000
              </div>
            </div>

            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {status === "sending" ? "送出中..." : "送出訊息"}
            </button>
          </form>
        )}
      </div>

      <Link
        href="/dashboard"
        className="inline-block text-white/60 hover:text-white text-sm font-medium"
      >
        ← 返回控制台
      </Link>
    </div>
  );
}
