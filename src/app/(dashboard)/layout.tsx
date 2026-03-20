"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import AdminOnlyNavLink from "@/components/admin/AdminOnlyNavLink";
import InstagramOnboardingModal from "@/components/profile/InstagramOnboardingModal";
import { supabase } from "@/lib/supabase";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 分鐘
const COUNTDOWN_START_MS = 60 * 1000; // 最後 60 秒顯示倒數

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // 預設為 null（未知），避免一開始就顯示「登入/註冊」按鈕
  const [authState, setAuthState] = useState<"unknown" | "guest" | "authed">("unknown");
  const [countdown, setCountdown] = useState<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleDeadlineRef = useRef<number>(Date.now() + IDLE_TIMEOUT_MS);

  // ---------- 閒置自動登出 ----------
  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdown(null);
  }, []);

  const handleLogout = useCallback(async () => {
    clearIdleTimers();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [clearIdleTimers]);

  const resetIdleTimer = useCallback(() => {
    if (authState !== "authed") return;
    clearIdleTimers();

    idleDeadlineRef.current = Date.now() + IDLE_TIMEOUT_MS;

    // 倒數最後 60 秒開始顯示
    idleTimerRef.current = setTimeout(() => {
      const end = Date.now() + COUNTDOWN_START_MS;
      setCountdown(Math.ceil(COUNTDOWN_START_MS / 1000));

      countdownIntervalRef.current = setInterval(() => {
        const remaining = Math.ceil((end - Date.now()) / 1000);
        if (remaining <= 0) {
          handleLogout();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    }, IDLE_TIMEOUT_MS - COUNTDOWN_START_MS);
  }, [authState, clearIdleTimers, handleLogout]);

  // 監聽使用者活動重置計時器
  useEffect(() => {
    if (authState !== "authed") return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const onActivity = () => resetIdleTimer();

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearIdleTimers();
    };
  }, [authState, resetIdleTimer, clearIdleTimers]);

  // ---------- Session 管理 ----------
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted) {
        setAuthState(session?.access_token ? "authed" : "guest");
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (_event === "SIGNED_OUT") {
        setAuthState("guest");
      } else if (session?.access_token) {
        setAuthState("authed");
      }
      // 不在其他事件（如 TOKEN_REFRESHED）時切到 guest
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isGuest = authState === "guest";
  const isAuthed = authState === "authed";
  const showNav = isAuthed;

  const navItems = [
    { href: "/dashboard", label: "控制台" },
    { href: "/analyze", label: "爆款分析" },
    { href: "/viral-db", label: "爆款資料庫" },
    { href: "/plans", label: "方案" },
    { href: "/billing", label: "帳單" },
    { href: "/settings", label: "設定" },
  ];

  const safePathname = pathname || "/dashboard";
  const loginHref = `/login?redirect=${encodeURIComponent(safePathname)}`;
  const registerHref = `/register?redirect=${encodeURIComponent(safePathname)}`;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 閒置倒數警告 */}
      {countdown !== null && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-black text-center py-2 text-sm font-semibold">
          ⚠️ 你已閒置過久，將在 {countdown} 秒後自動登出。
          <button
            onClick={resetIdleTimer}
            className="ml-3 px-3 py-1 bg-black text-white rounded text-xs hover:bg-gray-800"
          >
            我還在
          </button>
        </div>
      )}

      <header className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex flex-col leading-tight">
            <span className="text-2xl font-bold tracking-tight">Hookvox</span>
            <span className="text-xs text-white/40 font-normal">
              爆款腳本生成器
            </span>
          </Link>

          <nav className="hidden gap-6 md:flex items-center">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm transition ${
                    active ? "text-red-400" : "text-white/70 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <AdminOnlyNavLink />
          </nav>

          <div className="flex items-center gap-3">
            {authState === "unknown" ? null : isGuest ? (
              <>
                <Link
                  href={loginHref}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  登入
                </Link>
                <Link
                  href={registerHref}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                >
                  註冊
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                登出
              </button>
            )}
          </div>
        </div>
      </header>
      {showNav ? (
        <nav className="md:hidden flex gap-4 overflow-x-auto px-6 pb-3 text-sm text-white/70">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 transition-colors ${
                pathname === item.href ? "text-red-400" : "hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="shrink-0">
            <AdminOnlyNavLink />
          </div>
        </nav>
      ) : null}

      <main className="mx-auto max-w-7xl w-full px-6 py-8 flex-1">
        {children}
      </main>
      {isAuthed ? <InstagramOnboardingModal /> : null}

      <footer className="border-t border-white/10 py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <span>© 2026 Hookvox — by 金孫</span>
          <div className="flex gap-4">
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              服務條款
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              隱私權政策
            </Link>
            <Link
              href="/refund"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              退款政策
            </Link>
            <Link href="/contact" className="hover:text-white/60 transition-colors">
              聯繫我們
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
