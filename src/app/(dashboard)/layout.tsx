"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex flex-col leading-tight">
            <span className="text-2xl font-bold tracking-tight">Hookvox</span>
            <span className="text-xs text-white/40 font-normal">爆款腳本生成器</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
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
          </nav>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            登出
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl w-full px-6 py-8 flex-1">{children}</main>

      <footer className="border-t border-white/10 py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <span>© 2026 Hookvox — by 金孫</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white/60 transition-colors">服務條款</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">隱私權政策</Link>
            <a href="mailto:support@hookvox.ai" className="hover:text-white/60 transition-colors">聯繫客服</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
