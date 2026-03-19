"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  translateSupabaseAuthError,
  validateStrongPassword,
} from "@/lib/auth-messages";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      setMessage(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("兩次輸入的密碼不一致。");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(translateSupabaseAuthError(error.message));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: unknown) {
      setMessage(translateSupabaseAuthError((err as Error)?.message || "Failed to fetch"));
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold mb-2">重設密碼</h1>
        <p className="text-white/60 mb-6">
          請設定你的新密碼，完成後就可以重新登入 Hookvox。
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200 leading-7">
              密碼已成功更新，你現在可以使用新密碼登入 Hookvox。
            </div>

            <Link
              href="/login"
              className="block w-full rounded-lg bg-red-500 hover:bg-red-600 px-4 py-3 text-center font-semibold"
            >
              前往登入
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">新密碼</label>
              <input
                type="password"
                placeholder="至少 8 碼，需包含英文大寫、英文小寫、數字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm">再次輸入新密碼</label>
              <input
                type="password"
                placeholder="請再次輸入新密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none"
                required
              />
            </div>

            <p className="text-xs text-white/40 leading-6">
              密碼規則：至少 8 碼，且必須包含英文大寫、英文小寫與數字。
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 rounded-lg py-3 font-semibold transition disabled:opacity-50"
            >
              {loading ? "更新中..." : "更新密碼"}
            </button>

            {message ? (
              <p className="text-sm text-red-300">{message}</p>
            ) : null}

            <p className="text-center text-sm text-white/50">
              想回登入頁？{" "}
              <Link
                href="/login"
                className="text-red-400 hover:text-red-300 underline"
              >
                點此登入
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}