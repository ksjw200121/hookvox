"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  // Change password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  // Delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  async function saveProfile() {
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
          name: name.trim(),
          instagramHandle: normalizedHandle,
          skipped: !normalizedHandle,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "儲存失敗");
        return;
      }

      if (json?.user?.name !== undefined) setName(String(json.user.name || ""));
      setInstagramHandle(String(json?.user?.instagramHandle || ""));
      setMessage("已更新個人資料");
    } catch (err: any) {
      setError(err?.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwMessage("");
    setPwError("");

    if (!newPassword.trim()) {
      setPwError("請輸入新密碼");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("密碼至少需要 6 個字元");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("兩次輸入的密碼不一致");
      return;
    }

    setPwSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPwError(updateError.message || "變更密碼失敗");
        return;
      }

      setPwMessage("密碼已更新");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(err?.message || "變更密碼失敗");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError("");

    if (!deletePassword.trim()) {
      setDeleteError("請輸入密碼以確認刪除");
      return;
    }

    setDeleting(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        setDeleteError("未登入，請重新登入");
        return;
      }

      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json?.error || "刪除帳號失敗");
        return;
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: any) {
      setDeleteError(err?.message || "刪除帳號失敗");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black mb-2">個人設定</h1>
        <p className="text-white/45">
          你可以在這裡維護帳號基本資料。名稱和 IG 帳號都可以修改。
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="輸入你的名稱"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
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
                onClick={saveProfile}
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

      {/* 變更密碼 */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold mb-1">變更密碼</h2>
          <p className="text-sm text-white/45">輸入新密碼後點擊儲存即可變更。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-white/45 mb-2">新密碼</div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 個字元"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <div className="text-sm text-white/45 mb-2">確認新密碼</div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次輸入新密碼"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={pwSaving}
            className="rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {pwSaving ? "儲存中..." : "變更密碼"}
          </button>
          {pwMessage ? <span className="text-emerald-300 text-sm">{pwMessage}</span> : null}
          {pwError ? <span className="text-red-300 text-sm">{pwError}</span> : null}
        </div>
      </div>

      {/* 刪除帳號 */}
      <div className="rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-red-400 mb-1">危險區域</h2>
          <p className="text-sm text-white/50">
            刪除帳號後，所有資料將永久移除且無法恢復。請謹慎操作。
          </p>
        </div>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 px-4 py-2 text-sm font-semibold transition-colors"
          >
            刪除帳號
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-white/45 mb-2">
                請輸入密碼以確認刪除帳號
              </div>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="輸入你的密碼"
                className="w-full rounded-xl border border-red-500/30 bg-white/5 px-4 py-3 text-sm outline-none max-w-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {deleting ? "刪除中..." : "確認刪除帳號"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 px-4 py-2 text-sm font-semibold transition-colors"
              >
                取消
              </button>
            </div>
            {deleteError ? (
              <div className="text-red-300 text-sm">{deleteError}</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
