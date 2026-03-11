"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    // 註冊成功 — 顯示驗證提醒，不自動跳轉
    setSuccess(true)
    setLoading(false)
  }

  // 註冊成功後顯示提醒畫面
  if (success) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center relative z-50">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-3">請驗證你的 Email</h1>
          <p className="text-white/60 mb-2">
            我們已發送驗證信到
          </p>
          <p className="text-red-400 font-semibold mb-6">{email}</p>
          <p className="text-white/60 text-sm mb-8">
            請先到信箱點擊驗證連結，完成後再回來登入。<br />
            若沒看到信件，請檢查垃圾郵件資料夾。
          </p>
          <Link
            href="/login"
            className="block w-full bg-red-500 hover:bg-red-600 rounded-lg py-3 font-semibold transition"
          >
            前往登入
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 relative z-50">
        <h1 className="text-3xl font-bold mb-2">註冊帳號</h1>
        <p className="text-white/60 mb-6">建立你的 Hookvox 帳號</p>

        <form onSubmit={handleRegister} className="space-y-4 w-full relative z-50">
          <div>
            <label className="block mb-2 text-sm">Email</label>
            <input
              type="email"
              placeholder="請輸入 Email"
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
              placeholder="請輸入密碼（至少 6 碼）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none relative z-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 rounded-lg py-3 font-semibold transition cursor-pointer relative z-50 disabled:opacity-50"
            style={{ pointerEvents: "auto" }}
          >
            {loading ? "註冊中..." : "立即註冊"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-red-400">{message}</p>
        )}

        <p className="mt-6 text-center text-sm text-white/50 relative z-50">
          已經有帳號了？{" "}
          <Link href="/login" className="text-red-400 hover:text-red-300 underline">
            點此登入
          </Link>
        </p>
      </div>
    </main>
  )
}
