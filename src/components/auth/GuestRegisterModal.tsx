"use client";

import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
};

export default function GuestRegisterModal({
  open,
  onClose,
  title = "請先註冊或登入",
  description = "這個功能需要登入 Hookvox 後才能使用。註冊完成後，你就可以分析爆款影片、生成腳本、建立自己的爆款資料庫。",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="關閉視窗"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-white shadow-2xl">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-2xl font-black mb-3">{title}</h3>
        <p className="text-white/60 leading-7 mb-6">{description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/register"
            className="rounded-xl bg-brand-500 hover:bg-brand-400 px-4 py-3 text-center font-bold text-white transition-colors"
          >
            立即註冊 Hookvox
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-center font-bold text-white transition-colors"
          >
            我已有帳號
          </Link>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl px-4 py-3 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          先逛逛再說
        </button>
      </div>
    </div>
  );
}