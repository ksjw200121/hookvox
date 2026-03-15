"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuthTurnstile from "@/components/auth/AuthTurnstile";
import { translateSupabaseAuthError } from "@/lib/auth-messages";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!captchaToken) {
      setMessage("請先完成真人驗證。");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken,
    });

    if (error) {
      setMessage(translateSupabaseAuthError(error.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold mb-2">忘記密碼</h1>
        <p className="text-white/60 mb-6">
          輸入你註冊 Hookvox 的 Email，我們會寄一封重設密碼信給你。
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200 leading-7">
              重設密碼信已寄出到 <span className="font-semibold">{email}</span>。
              <br />
              請到信箱點擊連結後回來設定新密碼。
            </div>

            <Link
              href="/login"
              className="block w-full rounded-lg bg-red-500 hover:bg-red-600 px-4 py-3 text-center font-semibold"
            >
              回登入頁
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">Email</label>
              <input
                type="email"
                placeholder="請輸入註冊 Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none"
                required
              />
            </div>

            <AuthTurnstile
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              onError={() => {
                setCaptchaToken("");
                setMessage("真人驗證失敗，請重新驗證。");
              }}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 rounded-lg py-3 font-semibold transition disabled:opacity-50"
            >
              {loading ? "寄送中..." : "寄送重設密碼信"}
            </button>

            {message ? (
              <p className="text-sm text-red-300">{message}</p>
            ) : null}

            <p className="text-center text-sm text-white/50">
              想起密碼了？{" "}
              <Link
                href="/login"
                className="text-red-400 hover:text-red-300 underline"
              >
                回登入頁
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}