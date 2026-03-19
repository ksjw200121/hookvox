"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminOnlyNavLink from "@/components/admin/AdminOnlyNavLink";
import InstagramOnboardingModal from "@/components/profile/InstagramOnboardingModal";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isGuest, setIsGuest] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsGuest(!session?.access_token);
      setCheckingSession(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsGuest(!session?.access_token);
      setCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

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
            {checkingSession ? null : isGuest ? (
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

      <main className="mx-auto max-w-7xl w-full px-6 py-8 flex-1">
        {children}
      </main>
      {!checkingSession && !isGuest ? <InstagramOnboardingModal /> : null}

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