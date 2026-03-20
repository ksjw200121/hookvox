"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminSession } from "@/components/admin/useAdminSession";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/users", label: "使用者總覽" },
  { href: "/admin/revenue", label: "收入" },
  { href: "/admin/costs", label: "成本監控" },
  { href: "/admin/messages", label: "留言" },
];

export function AdminSectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        {subtitle ? <p className="text-sm text-white/45 mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, isAdmin, error, profile } = useAdminSession();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 text-white/60">
        正在檢查管理員權限...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
        {error || "你沒有管理員權限。"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black">管理員後台</h1>
            <p className="mt-2 text-sm text-white/45">
              查使用者、看付款與用量、做低風險客服處理，再逐步進階到額度與訂閱修復。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            {profile?.user?.name || profile?.user?.email || "管理員"}
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-3">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
