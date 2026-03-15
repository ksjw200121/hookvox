"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
};

export default function GuestAccessModal({
  open,
  title = "請先註冊或登入",
  description = "這個功能需要登入後才能使用。註冊後即可開始分析影片、生成腳本、收藏靈感內容。",
  onClose,
}: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-2xl">
          🔒
        </div>

        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-white/60">{description}</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/register?redirect=${encodeURIComponent(pathname)}`}
            className="inline-flex items-center justify-center rounded-2xl bg-brand-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-400"
          >
            立即註冊
          </Link>

          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/90 transition hover:bg-white/10"
          >
            前往登入
          </Link>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white/80"
        >
          先逛逛再說
        </button>
      </div>
    </div>
  );
}