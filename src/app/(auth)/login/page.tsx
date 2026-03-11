"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("登入成功，正在跳轉...");

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 relative z-50">
        <h1 className="text-3xl font-bold mb-2">登入帳號</h1>
        <p className="text-white/60 mb-6">登入你的 Hookvox 帳號</p>

        <form onSubmit={handleLogin} className="space-y-4 w-full relative z-50">
          <div className="w-full">
            <label className="block mb-2 text-sm">Email</label>
            <input
              type="email"
              className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入 Email"
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

          <button
            type="submit"
            disabled={loading}
            className="block w-full rounded-lg bg-red-500 hover:bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50 cursor-pointer relative z-50"
            style={{ pointerEvents: "auto" }}
          >
            {loading ? "登入中..." : "立即登入"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-red-300">{message}</p> : null}

        <p className="mt-6 text-center text-sm text-white/50">
          還沒有帳號？{" "}
          <Link href="/register" className="text-red-400 hover:text-red-300 underline">
            點此註冊
          </Link>
        </p>
      </div>
    </main>
  );
}
