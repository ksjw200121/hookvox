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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // 路由切換時關閉手機選單
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isGuest = authState === "guest";
  const isAuthed = authState === "authed";
  const showNav = isAuthed;

  const navItems = [
    { href: "/dashboard", label: "控制台" },
    { href: "/analyze", label: "爆款分析" },
    { href: "/viral-db", label: "爆款資料庫" },
    { href: "/plans", label: "方案" },
    { href: "/billing", label: "帳單" },
    { href: "/guide", label: "教學", external: true },
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
            {navItems.map((item: any) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
                className="hidden md:block rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                登出
              </button>
            )}

            {/* 漢堡按鈕 (手機版) */}
            {isAuthed && (
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="選單"
              >
                <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-[3px]" : ""}`} />
                <span className={`block w-5 h-0.5 bg-white mt-1 transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : ""}`} />
                <span className={`block w-5 h-0.5 bg-white mt-1 transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
              </button>
            )}
          </div>
        </div>
      </header>
      {/* 手機版側邊選單 */}
      {isAuthed && (
        <>
          {/* 背景遮罩 */}
          <div
            className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${
              mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* 選單面板 */}
          <div
            className={`fixed top-0 right-0 h-full w-64 bg-black border-l border-white/10 z-50 md:hidden transform transition-transform duration-300 ${
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <span className="text-lg font-bold">選單</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/60"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col py-4">
              {navItems.map((item: any) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "text-red-400 bg-red-500/10"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="px-6 py-3">
                <AdminOnlyNavLink />
              </div>
              <div className="border-t border-white/10 mt-4 pt-4 px-6">
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
                >
                  登出
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

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
