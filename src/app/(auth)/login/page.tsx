"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuthTurnstile from "@/components/auth/AuthTurnstile";
import { translateSupabaseAuthError } from "@/lib/auth-messages";
import { useSearchParams } from "next/navigation";

function safeRedirectPath(input: string | null, fallback = "/dashboard") {
  const v = String(input || "").trim();
  if (!v) return fallback;
  // allow only same-origin relative paths
  if (!v.startsWith("/")) return fallback;
  if (v.startsWith("//")) return fallback;
  return v;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"), "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccessMessage("");

    // Supabase 後台有開啟 Captcha，沒有 token 就送出會直接被拒絕（500）
    if (!captchaToken) {
      setMessage("請等待真人驗證完成（顯示「成功」✓）後再點擊登入。若驗證一直沒出現，請重新整理頁面。");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (error) {
        // captcha 相關錯誤給更清楚的中文指引
        const lowerMsg = (error.message || "").toLowerCase();
        if (lowerMsg.includes("captcha")) {
          setMessage("真人驗證失敗，請等待驗證框重新載入後再試。若持續失敗，請重新整理頁面。");
          // 清掉已失效的 token，讓 Turnstile 重新產生
          setCaptchaToken("");
        } else {
          setMessage(translateSupabaseAuthError(error.message));
        }
        setLoading(false);
        return;
      }

      setSuccessMessage("登入成功，正在返回頁面...");

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 800);
    } catch (err: unknown) {
      // 捕獲 "Failed to fetch" 等網路層錯誤（Supabase SDK 可能直接 throw）
      const errMsg = (err as Error)?.message || "";
      if (errMsg.toLowerCase().includes("captcha")) {
        setMessage("真人驗證失敗，請重新整理頁面後再試。");
        setCaptchaToken("");
      } else {
        setMessage(translateSupabaseAuthError(errMsg || "Failed to fetch"));
      }
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 relative z-50">
        <h1 className="text-3xl font-bold mb-2">登入 Hookvox</h1>
        <p className="text-white/60 mb-6">
          登入你的 Hookvox 帳號，開始分析爆款內容與生成腳本。
        </p>

        <form onSubmit={handleLogin} className="space-y-4 w-full relative z-50">
          <div className="w-full">
            <label className="block mb-2 text-sm">Email</label>
            <input
              type="email"
              className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入你的 Email"
              required
            />
          </div>

          <div className="w-full">
            <label className="block mb-2 text-sm">密碼</label>
            <input
              type="password"
              className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              required
            />
          </div>

          <AuthTurnstile
            onVerify={(token) => {
              setCaptchaToken(token);
              // 驗證成功時，清除之前可能殘留的錯誤訊息
              setMessage((prev) =>
                prev.includes("驗證") || prev.includes("連線") ? "" : prev
              );
            }}
            onExpire={() => setCaptchaToken("")}
            onError={() => {
              setCaptchaToken("");
              // 不立即顯示錯誤——Turnstile 會自動重試。
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="block w-full rounded-lg bg-red-500 hover:bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50 cursor-pointer relative z-50"
          >
            {loading ? "登入中..." : "立即登入"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-red-300">{message}</p>}
        {successMessage && (
          <p className="mt-4 text-sm text-emerald-300">{successMessage}</p>
        )}

        <div className="mt-6 space-y-3 text-center text-sm">
          <p className="text-white/50">
            忘記密碼？{" "}
            <Link
              href="/forgot-password"
              className="text-red-400 hover:text-red-300 underline"
            >
              點此重設
            </Link>
          </p>

          <p className="text-white/50">
            還沒有帳號？{" "}
            <Link
              href="/register"
              className="text-red-400 hover:text-red-300 underline"
            >
              立即註冊 Hookvox
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
