"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SKIP_KEY = "hookvox_ig_onboarding_skip_v1";

export default function InstagramOnboardingModal() {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const displayHandle = useMemo(() => instagramHandle.replace(/^@+/, ""), [instagramHandle]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const skipped = localStorage.getItem(SKIP_KEY) === "1";
        if (skipped) {
          if (mounted) {
            setOpen(false);
            setLoading(false);
          }
          return;
        }

        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;
        if (!token) {
          if (mounted) {
            setOpen(false);
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/profile/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();

        if (!mounted) return;

        if (!res.ok) {
          setOpen(false);
          setLoading(false);
          return;
        }

        const existingHandle = String(json?.user?.instagramHandle || "").trim();
        setInstagramHandle(existingHandle);
        setOpen(!existingHandle);
      } catch {
        if (mounted) setOpen(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  async function saveProfile(skipped: boolean) {
    try {
      setSaving(true);
      setMessage("");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setMessage("登入狀態已失效，請重新登入");
        return;
      }

      const res = await fetch("/api/profile/instagram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instagramHandle: displayHandle,
          skipped,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setMessage(json?.error || "儲存失敗，請稍後再試");
        return;
      }

      if (skipped) {
        localStorage.setItem(SKIP_KEY, "1");
      }

      setOpen(false);
    } catch {
      setMessage("儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <h2 className="text-2xl font-black">完善你的 IG 資料</h2>
        <p className="mt-2 text-sm text-white/55">
          這不是必填，但填寫後我們可以在後台更快協助你處理帳號與客服問題。
        </p>

        <div className="mt-5">
          <label className="mb-2 block text-sm text-white/70">Instagram 帳號（選填）</label>
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3">
            <span className="mr-1 text-white/40">@</span>
            <input
              value={displayHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="例如 fang.0721"
              className="w-full bg-transparent px-1 py-3 text-sm outline-none"
            />
          </div>
        </div>

        {message ? <p className="mt-3 text-sm text-red-300">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => saveProfile(false)}
            disabled={saving || !displayHandle}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存 IG"}
          </button>
          <button
            type="button"
            onClick={() => saveProfile(true)}
            disabled={saving}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            稍後再填
          </button>
        </div>
      </div>
    </div>
  );
}
