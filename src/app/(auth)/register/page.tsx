"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthTurnstile from "@/components/auth/AuthTurnstile";
import {
  translateSupabaseAuthError,
  validateStrongPassword,
} from "@/lib/auth-messages";

function RegisterForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const loginHref = `/login?redirect=${encodeURIComponent(redirectTo)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [resendCaptchaToken, setResendCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setResendMessage("");

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      setMessage(passwordError);
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      setMessage("請先完成真人驗證。");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        emailRedirectTo: `${window.location.origin}${loginHref}`,
      },
    });

    if (error) {
      setMessage(translateSupabaseAuthError(error.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage("");

    if (!resendCaptchaToken) {
      setResendMessage("請先完成真人驗證後再重新寄送。");
      setResendLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        captchaToken: resendCaptchaToken,
        emailRedirectTo: `${window.location.origin}${loginHref}`,
      },
    });

    if (error) {
      setResendMessage(translateSupabaseAuthError(error.message));
      setResendLoading(false);
      return;
    }

    setResendMessage("驗證信已重新寄出，請檢查信箱。");
    setResendCaptchaToken("");
    setResendLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center relative z-50">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-3">請驗證你的 Hookvox 帳號</h1>
          <p className="text-white/60 mb-2">我們已經寄出驗證信到</p>
          <p className="text-red-400 font-semibold mb-6 break-all">{email}</p>
          <p className="text-white/60 text-sm mb-6 leading-7">
            請先到信箱點擊驗證連結，完成 Hookvox 帳號驗證後再回來登入。
            <br />
            如果沒看到信件，請先檢查垃圾郵件或促銷信件資料夾。
          </p>

          <div className="mb-4">
            <AuthTurnstile
              onVerify={(token) => {
                setResendCaptchaToken(token);
                setResendMessage("");
              }}
              onExpire={() => setResendCaptchaToken("")}
              onError={() => {
                setResendCaptchaToken("");
                setResendMessage("真人驗證失敗，請重新驗證。");
              }}
            />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="block w-full rounded-lg border border-white/10 bg-white/5 py-3 font-semibold transition hover:bg-white/10 disabled:opacity-50"
            >
              {resendLoading ? "重新寄送中..." : "重新寄送驗證信"}
            </button>

            <Link
              href={loginHref}
              className="block w-full bg-red-500 hover:bg-red-600 rounded-lg py-3 font-semibold transition"
            >
              前往登入
            </Link>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="block w-full rounded-lg border border-white/10 bg-white/5 py-3 font-semibold transition hover:bg-white/10"
            >
              我已驗證，重新整理
            </button>
          </div>

          {resendMessage && (
            <p
              className={`mt-4 text-sm ${
                resendMessage.includes("已重新寄出")
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {resendMessage}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 relative z-50">
        <h1 className="text-3xl font-bold mb-2">註冊 Hookvox</h1>
        <p className="text-white/60 mb-6">
          建立你的 Hookvox 帳號，開始分析爆款影片與生成腳本。
        </p>

        <form onSubmit={handleRegister} className="space-y-4 w-full relative z-50">
          <div>
            <label className="block mb-2 text-sm">Email</label>
            <input
              type="email"
              placeholder="請輸入你的 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none relative z-50"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">密碼</label>
            <input
              type="password"
              placeholder="至少 8 碼，需包含英文大寫、英文小寫、數字"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none relative z-50"
              required
            />
            <p className="mt-2 text-xs text-white/40 leading-6">
              密碼規則：至少 8 碼，且必須包含英文大寫、英文小寫與數字。
            </p>
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
            className="w-full bg-red-500 hover:bg-red-600 rounded-lg py-3 font-semibold transition cursor-pointer relative z-50 disabled:opacity-50"
            style={{ pointerEvents: "auto" }}
          >
            {loading ? "註冊中..." : "立即註冊"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-red-400">{message}</p>}

        <p className="mt-6 text-center text-sm text-white/50 relative z-50">
          已經有帳號了？{" "}
          <Link
            href={loginHref}
            className="text-red-400 hover:text-red-300 underline"
          >
            立即登入
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/60">載入中...</p>
          </div>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}