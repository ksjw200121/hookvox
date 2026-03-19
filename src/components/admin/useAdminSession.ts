"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AdminMeResponse = {
  loggedIn?: boolean;
  isAdmin?: boolean;
  role?: string;
  user?: {
    email?: string;
    name?: string;
  };
};

export function useAdminSession() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<AdminMeResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const nextToken = session?.access_token || null;

        if (!mounted) return;

        setToken(nextToken);

        if (!nextToken) {
          setError("未登入");
          setIsAdmin(false);
          return;
        }

        const res = await fetch("/api/admin/me", {
          headers: {
            Authorization: `Bearer ${nextToken}`,
          },
        });

        const json = (await res.json()) as AdminMeResponse & { error?: string };

        if (!mounted) return;

        if (!res.ok) {
          setError(json?.error || "讀取管理員身份失敗");
          setIsAdmin(false);
          return;
        }

        setProfile(json);
        setIsAdmin(Boolean(json?.isAdmin));
        setError(Boolean(json?.isAdmin) ? "" : "沒有管理員權限");
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "讀取管理員身份失敗");
        setIsAdmin(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    loading,
    token,
    isAdmin,
    error,
    profile,
  };
}
