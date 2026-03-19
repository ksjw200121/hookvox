"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileResponse = {
  user?: {
    supabaseId?: string;
    email?: string;
    name?: string;
    instagramHandle?: string | null;
  };
};

function normalizeHandle(input: string) {
  return input.replace(/^@+/, "").trim();
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  const normalizedHandle = useMemo(
    () => normalizeHandle(instagramHandle),
    [instagramHandle]
  );

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;
        if (!token) {
          setError("未登入，請重新登入");
          return;
        }

        const res = await fetch("/api/profile/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = (await res.json()) as ProfileResponse & { error?: string };
        if (!res.ok) {
          setError(json?.error || "讀取個人資料失敗");
          return;
        }

        setEmail(String(json.user?.email || ""));
        setName(String(json.user?.name || ""));
        setInstagramHandle(String(json.user?.instagramHandle || ""));
      } catch (err: any) {
        setError(err?.message || "讀取個人資料失敗");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function saveInstagram() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        setError("未登入，請重新登入");
        return;
      }

      const res = await fetch("/api/profile/instagram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instagramHandle: normalizedHandle,
          skipped: !normalizedHandle,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "儲存 IG 失敗");
        return;
      }

      setInstagramHandle(String(json?.user?.instagramHandle || ""));
      setMessage("已更新 IG 帳號");
    } catch (err: any) {
      setError(err?.message || "儲存 IG 失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black mb-2">個人設定</h1>
        <p className="text-white/45">
          你可以在這裡維護帳號基本資料，目前可修改 IG 帳號供客服快速協助。
        </p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-5">
        {loading ? (
          <div className="text-white/50">讀取中...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-white/45 mb-2">Email</div>
                <input
                  value={email}
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
                />
              </div>
              <div>
                <div className="text-sm text-white/45 mb-2">名稱</div>
                <input
                  value={name || "未設定"}
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
                />
              </div>
            </div>

            <div>
              <div className="text-sm text-white/45 mb-2">Instagram 帳號</div>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3">
                <span className="text-white/40 mr-1">@</span>
                <input
                  value={normalizedHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="例如 fang.0721"
                  className="w-full bg-transparent px-1 py-3 text-sm outline-none"
                />
              </div>
              <div className="text-xs text-white/35 mt-2">
                這是選填，主要用於客服識別與後台查詢。
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveInstagram}
                disabled={saving}
                className="rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "儲存中..." : "儲存設定"}
              </button>
              {message ? <span className="text-emerald-300 text-sm">{message}</span> : null}
              {error ? <span className="text-red-300 text-sm">{error}</span> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
