"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminOnlyNavLink() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;

        if (!token) {
          setIsAdmin(false);
          return;
        }

        const res = await fetch("/api/admin/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(Boolean(json?.isAdmin));
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Link
      href="/admin/users"
      className="text-sm font-medium text-white/70 hover:text-white transition-colors"
    >
      Admin
    </Link>
  );
}