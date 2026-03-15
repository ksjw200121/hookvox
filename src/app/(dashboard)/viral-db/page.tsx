"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GuestAccessModal from "@/components/auth/GuestAccessModal";

interface GeneratedScene {
  id?: number;
  timeRange?: string;
  visual?: string;
  visualContent?: string;
  voiceover?: string;
  caption?: string;
  purpose?: string;
  shootingTip?: string;
}

interface GeneratedScript {
  version?: string;
  hook?: string;
  fullScript?: string;
  cta?: string;
  scenes?: GeneratedScene[];
}

interface AngleGeneratedScript {
  hook?: string;
  fullScript?: string;
  cta?: string;
  scenes?: GeneratedScene[];
  generatedAt?: string;
}

interface NextAngle {
  id: number;
  angle: string;
  hook: string;
  whyThisWorks?: string;
  generatedScript?: AngleGeneratedScript | null;
}

interface GeneratedContent {
  titles?: string[];
  bestScriptVersion?: string;
  scripts?: GeneratedScript[];
  storyboard?: GeneratedScene[];
  adaptedVersion?: {
    enabled?: boolean;
    topic?: string;
    hook?: string;
    fullScript?: string;
  };
  generatedAt?: string;
  updatedAt?: string;
}

interface ViralAnalysis {
  coreTopic?: string;
  hook?: string;
  summary?: string;
  hookModel?: string;
  targetAudience?: string;
  emotion?: string;
  ctaType?: string;
  combinedFormula?: string;
  viralReasons?: string[];
  painPoints?: string[];
  keyInsights?: string[];
  legalIssues?: string[];
  generated?: GeneratedContent;
  nextAngles?: NextAngle[];
  [key: string]: any;
}

interface ViralItem {
  id: string;
  userId: string;
  videoUrl: string | null;
  transcript: string | null;
  analysis: ViralAnalysis | null;
  isSaved?: boolean;
  savedAt?: string | null;
  createdAt: string;
}

type TabType = "all" | "saved";
type PlanName = "FREE" | "CREATOR" | "PRO" | "FLAGSHIP";

export default function ViralDatabasePage() {
  const [items, setItems] = useState<ViralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageError, setPageError] = useState("");
  const [plan, setPlan] = useState<PlanName>("FREE");
  const [angleScriptLimitPerVideo, setAngleScriptLimitPerVideo] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const [anglesLoadingId, setAnglesLoadingId] = useState<string | null>(null);
  const [angleScriptLoadingKey, setAngleScriptLoadingKey] = useState<string | null>(null);
  const [showOnboardDb, setShowOnboardDb] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("hookvox_onboard_viraldb_seen")) {
      setShowOnboardDb(true);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setIsGuest(true);
        setItems([]);
        setPlan("FREE");
        setAngleScriptLimitPerVideo(0);
        return;
      }

      setIsGuest(false);

      const query = searchQuery.trim();
      const endpoint = query
        ? `/api/viral-database?q=${encodeURIComponent(query)}`
        : "/api/viral-database";

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = `/login?redirect=${encodeURIComponent("/viral-db")}`;
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        setPageError(json?.error || "讀取爆款資料庫失敗");
        return;
      }

      setItems(json.items || []);
      setPlan(json?.meta?.plan || "FREE");
      setAngleScriptLimitPerVideo(json?.meta?.angleScriptLimitPerVideo ?? 0);
    } catch (error) {
      console.error("viral-db page error:", error);
      setPageError("讀取爆款資料庫失敗");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const onFocus = () => {
      if (!isGuest) loadItems();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isGuest, loadItems]);

  const filteredItems = useMemo(() => {
    if (activeTab === "saved") {
      return items.filter((item) => item.isSaved);
    }
    return items;
  }, [items, activeTab]);

  function updateItem(nextItem: ViralItem) {
    setItems((prev) =>
      prev.map((item) => (item.id === nextItem.id ? nextItem : item))
    );
  }

  function countGeneratedAngleScripts(item: ViralItem) {
    const nextAngles = Array.isArray(item.analysis?.nextAngles)
      ? item.analysis?.nextAngles
      : [];

    return nextAngles.filter((angle) => angle?.generatedScript).length;
  }

  function canGenerateAngleScript(item: ViralItem, angle: NextAngle) {
    if (angle.generatedScript) return true;
    if (plan === "PRO" || plan === "FLAGSHIP") return true;
    if (plan === "CREATOR") {
      return countGeneratedAngleScripts(item) < 1;
    }
    return false;
  }

  const isProOrFlagship = plan === "PRO" || plan === "FLAGSHIP";

  async function copyAllTitles(item: ViralItem) {
    const titles = item.analysis?.generated?.titles || [];
    if (titles.length === 0) return;
    const text = titles.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setPageError("");
      // 可選：短暫 toaster，這裡用 pageError 顯示成功會閃一下，改為 window 提示或省略
      window.alert("已複製全部標題到剪貼簿");
    } catch {
      setPageError("複製失敗，請手動複製");
    }
  }

  function exportItemAsTxt(item: ViralItem) {
    const lines: string[] = [];
    lines.push(`# Hookvox 爆款筆記 — ${item.id}`);
    lines.push("");
    if (item.videoUrl) {
      lines.push("## 原影片連結");
      lines.push(item.videoUrl);
      lines.push("");
    }
    const a = item.analysis;
    if (a) {
      if (a.coreTopic) {
        lines.push("## 核心主題");
        lines.push(a.coreTopic);
        lines.push("");
      }
      if (a.hook) {
        lines.push("## 開頭 Hook");
        lines.push(a.hook);
        lines.push("");
      }
      if (a.summary) {
        lines.push("## 分析摘要");
        lines.push(a.summary);
        lines.push("");
      }
      if (a.combinedFormula) {
        lines.push("## 爆款公式");
        lines.push(a.combinedFormula);
        lines.push("");
      }
      if (a.painPoints?.length) {
        lines.push("## 痛點");
        lines.push(a.painPoints.join("\n"));
        lines.push("");
      }
      if (a.keyInsights?.length) {
        lines.push("## 關鍵洞察");
        lines.push(a.keyInsights.join("\n"));
        lines.push("");
      }
    }
    const gen = item.analysis?.generated;
    if (gen?.titles?.length) {
      lines.push("## 生成標題");
      gen.titles.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
      lines.push("");
    }
    if (gen?.scripts?.length) {
      gen.scripts.forEach((script, idx) => {
        lines.push(`## 生成腳本 版本 ${script.version ?? idx + 1}`);
        if (script.hook) lines.push("Hook: " + script.hook);
        if (script.fullScript) lines.push(script.fullScript);
        if (script.cta) lines.push("CTA: " + script.cta);
        lines.push("");
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = `hookvox-${item.id}.txt`;
    aEl.click();
    URL.revokeObjectURL(url);
  }

  function openGuestModal() {
    setShowGuestModal(true);
  }

  async function handleToggleSave(id: string, nextSaved: boolean) {
    if (isGuest) {
      openGuestModal();
      return;
    }

    try {
      setSavingId(id);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setPageError("找不到登入 token");
        return;
      }

      const res = await fetch(`/api/viral-database/${id}/save`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          saved: nextSaved,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setPageError(json?.error || "收藏更新失敗");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                isSaved: nextSaved,
                savedAt: nextSaved ? new Date().toISOString() : null,
              }
            : item
        )
      );
    } catch (error) {
      console.error("toggle save error:", error);
      setPageError("收藏更新失敗");
    } finally {
      setSavingId(null);
    }
  }

  async function handleGenerateAngles(itemId: string) {
    if (isGuest) {
      openGuestModal();
      return;
    }

    try {
      setAnglesLoadingId(itemId);
      setPageError("");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setPageError("找不到登入 token");
        return;
      }

      const res = await fetch(`/api/viral-database/${itemId}/angles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        setPageError(json?.error || "生成爆款延伸失敗");
        return;
      }

      if (json?.item) {
        updateItem(json.item);
      }

      if (json?.meta?.plan) {
        setPlan(json.meta.plan);
      }

      if (typeof json?.meta?.angleScriptLimitPerVideo === "number") {
        setAngleScriptLimitPerVideo(json.meta.angleScriptLimitPerVideo);
      }
    } catch (error) {
      console.error("generate angles error:", error);
      setPageError("生成爆款延伸失敗");
    } finally {
      setAnglesLoadingId(null);
    }
  }

  async function handleGenerateAngleScript(itemId: string, angleId: number) {
    if (isGuest) {
      openGuestModal();
      return;
    }

    try {
      const loadingKey = `${itemId}-${angleId}`;
      setAngleScriptLoadingKey(loadingKey);
      setPageError("");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setPageError("找不到登入 token");
        return;
      }

      const res = await fetch(`/api/viral-database/${itemId}/angle-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          angleId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setPageError(json?.error || "生成延伸腳本失敗");
        return;
      }

      if (json?.item) {
        updateItem(json.item);
      }

      if (json?.meta?.plan) {
        setPlan(json.meta.plan);
      }

      if (typeof json?.meta?.angleScriptLimitPerVideo === "number") {
        setAngleScriptLimitPerVideo(json.meta.angleScriptLimitPerVideo);
      }
    } catch (error) {
      console.error("generate angle script error:", error);
      setPageError("生成延伸腳本失敗");
    } finally {
      setAngleScriptLoadingKey(null);
    }
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-black mb-2">
            爆款資料庫{isGuest ? "（訪客模式）" : ""}
          </h1>
          <p className="text-white/40">
            {isGuest
              ? "你可以先看資料庫頁面，登入後才能看到自己的分析紀錄與靈感簿。"
              : "查看你分析過的影片，建立自己的內容靈感簿。"}
          </p>
        </div>

        {!isGuest && showOnboardDb && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-bold text-emerald-200 mb-1">👋 第一次來爆款資料庫？</div>
              <div className="text-sm text-white/70">
                這裡會列出你所有分析過的影片。可搜尋、加入靈感簿，每支影片還能生成「爆款延伸」腳本（依方案不同有 1～3 個）。
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") localStorage.setItem("hookvox_onboard_viraldb_seen", "1");
                setShowOnboardDb(false);
              }}
              className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500/30 text-white font-bold text-sm hover:bg-emerald-500/50 transition-colors"
            >
              知道了
            </button>
          </div>
        )}

        {isGuest && !loading && (
          <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-bold text-white mb-1">
                  目前是訪客模式
                </div>
                <div className="text-sm text-white/60">
                  你可以先瀏覽資料庫頁面結構，但搜尋、收藏、延伸腳本等功能都需要先登入。
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={openGuestModal}
                  className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white hover:bg-brand-400 transition-colors"
                >
                  註冊帳號
                </button>
                <button
                  type="button"
                  onClick={openGuestModal}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/90 hover:bg-white/10 transition-colors"
                >
                  登入
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div>
              <div className="font-bold text-white">資料庫搜尋</div>
              <div className="text-sm text-white/40">
                可搜尋主題、Hook、摘要、痛點、生成標題、延伸角度與延伸腳本內容
              </div>
            </div>

            <div className="text-sm text-white/60">
              目前方案：<span className="font-bold text-white">{isGuest ? "訪客" : plan}</span>
              {" ／ "}
              延伸腳本上限：
              <span className="font-bold text-emerald-300">
                {isGuest ? "-" : angleScriptLimitPerVideo}
              </span>
              /每支影片
            </div>
          </div>

          <div className="flex gap-3 flex-col md:flex-row">
            <input
              value={searchInput}
              onChange={(e) => {
                if (isGuest) {
                  setSearchInput(e.target.value);
                  return;
                }
                setSearchInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (isGuest) {
                    openGuestModal();
                    return;
                  }
                  setSearchQuery(searchInput.trim());
                }
              }}
              placeholder="搜尋主題、Hook、痛點、標題、延伸角度..."
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none text-white placeholder:text-white/30"
            />

            <button
              type="button"
              onClick={() => {
                if (isGuest) {
                  openGuestModal();
                  return;
                }
                setSearchQuery(searchInput.trim());
              }}
              className="px-5 py-3 rounded-xl bg-brand-500 text-white font-bold"
            >
              搜尋
            </button>

            <button
              type="button"
              onClick={() => {
                if (isGuest) {
                  openGuestModal();
                  return;
                }
                setSearchInput("");
                setSearchQuery("");
              }}
              className="px-5 py-3 rounded-xl bg-white/5 text-white/70 font-bold border border-white/10"
            >
              清除
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === "all"
                ? "bg-brand-500 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            全部影片
          </button>

          <button
            type="button"
            onClick={() => {
              if (isGuest) {
                openGuestModal();
                return;
              }
              setActiveTab("saved");
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === "saved"
                ? "bg-yellow-500 text-black"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            靈感簿
          </button>
        </div>

        {pageError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {pageError}
          </div>
        )}

        {loading && (
          <div className="glass rounded-2xl p-6 text-white/50">讀取中...</div>
        )}

        {!loading && isGuest && (
          <div className="glass rounded-2xl p-8 text-white/60">
            先登入後，就能查看你分析過的影片、收藏靈感簿、瀏覽生成腳本與爆款延伸內容。
          </div>
        )}

        {!loading && !isGuest && filteredItems.length === 0 && activeTab === "all" && (
          <div className="glass rounded-2xl p-6 text-white/50">
            {searchQuery
              ? "找不到符合搜尋條件的影片。"
              : "目前還沒有分析紀錄，先去分析一支影片吧。"}
          </div>
        )}

        {!loading && !isGuest && filteredItems.length === 0 && activeTab === "saved" && (
          <div className="glass rounded-2xl p-6 text-white/50">
            你的靈感簿目前是空的，先把喜歡的影片加入收藏吧。
          </div>
        )}

        {!isGuest && (
          <div className="grid gap-5">
            {filteredItems.map((item) => {
              const generated = item.analysis?.generated;
              const generatedTitles = generated?.titles || [];
              const generatedScripts = generated?.scripts || [];
              const generatedStoryboard = generated?.storyboard || [];
              const nextAngles = Array.isArray(item.analysis?.nextAngles)
                ? item.analysis?.nextAngles
                : [];
              const generatedAngleScriptCount = countGeneratedAngleScripts(item);

              return (
                <div key={item.id} className="glass rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-sm text-white/40">
                      分析時間：{new Date(item.createdAt).toLocaleString()}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {item.videoUrl && (
                        <a
                          href={item.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-400 hover:text-brand-300 text-sm font-medium"
                        >
                          原影片連結 →
                        </a>
                      )}

                      {isProOrFlagship && (
                        <button
                          type="button"
                          onClick={() => exportItemAsTxt(item)}
                          className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          匯出 .txt
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleSave(item.id, !item.isSaved)}
                        disabled={savingId === item.id}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                          item.isSaved
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {savingId === item.id
                          ? "處理中..."
                          : item.isSaved
                          ? "已加入靈感簿"
                          : "加入靈感簿"}
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-sm text-white/40 mb-2">核心主題</div>
                      <div className="font-bold text-lg">
                        {item.analysis?.coreTopic || "未提供"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-sm text-white/40 mb-2">Hook 類型</div>
                      <div className="font-bold text-lg">
                        {item.analysis?.hookModel || "未提供"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-white/40 mb-2">開頭 Hook</div>
                    <div className="leading-relaxed whitespace-pre-wrap">
                      {item.analysis?.hook || "未提供"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm text-white/40 mb-2">分析摘要</div>
                    <div className="leading-relaxed whitespace-pre-wrap">
                      {item.analysis?.summary || "未提供"}
                    </div>
                  </div>

                  {(generatedTitles.length > 0 || generatedScripts.length > 0) && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="font-bold text-emerald-300">
                          已保存的生成內容
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isProOrFlagship && generatedTitles.length > 0 && (
                            <button
                              type="button"
                              onClick={() => copyAllTitles(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                            >
                              一鍵複製全部標題
                            </button>
                          )}
                          <span className="text-xs text-emerald-200/70">
                            {generated?.updatedAt
                              ? `最後更新：${new Date(generated.updatedAt).toLocaleString()}`
                              : "已保存到資料庫"}
                          </span>
                        </div>
                      </div>

                      {generatedTitles.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm text-white/50">生成標題</div>
                          <div className="grid gap-2">
                            {generatedTitles.map((title, index) => (
                              <div
                                key={index}
                                className="rounded-lg bg-black/20 p-3 text-white/90"
                              >
                                {index + 1}. {title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {generatedScripts.length > 0 && (
                        <details className="rounded-xl border-2 border-brand-500/50 bg-brand-500/10 p-4 shadow-lg">
                          <summary className="cursor-pointer font-bold text-brand-200 text-base hover:text-white transition-colors flex items-center gap-2">
                            <span className="text-xl">▶</span>
                            查看生成腳本（{generatedScripts.length} 版）
                          </summary>

                          <div className="mt-4 grid gap-4">
                            {generatedScripts.map((script, index) => (
                              <div
                                key={index}
                                className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
                              >
                                <div className="font-bold text-brand-300">
                                  版本 {script.version || index + 1}
                                </div>

                                <div>
                                  <div className="text-sm text-white/40 mb-1">
                                    Hook
                                  </div>
                                  <div className="whitespace-pre-wrap leading-relaxed">
                                    {script.hook || "未提供"}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm text-white/40 mb-1">
                                    完整腳本
                                  </div>
                                  <div className="whitespace-pre-wrap leading-relaxed text-white/80">
                                    {script.fullScript || "未提供"}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm text-white/40 mb-1">CTA</div>
                                  <div className="whitespace-pre-wrap leading-relaxed text-amber-200">
                                    {script.cta || "未提供"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {generatedStoryboard.length > 0 && (
                        <details className="rounded-xl bg-black/20 p-4">
                          <summary className="cursor-pointer font-medium text-white/90">
                            查看分鏡表（{generatedStoryboard.length} 個鏡頭）
                          </summary>

                          <div className="mt-4 grid gap-3">
                            {generatedStoryboard.map((scene, index) => (
                              <div
                                key={index}
                                className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2"
                              >
                                <div className="font-bold text-purple-300">
                                  鏡頭 {index + 1}{" "}
                                  {scene.timeRange ? `｜${scene.timeRange}` : ""}
                                </div>

                                {scene.purpose && (
                                  <div className="text-sm text-purple-200/80">
                                    用途：{scene.purpose}
                                  </div>
                                )}

                                {(scene.visualContent || scene.visual) && (
                                  <div>
                                    <div className="text-sm text-white/40 mb-1">
                                      畫面
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed">
                                      {scene.visualContent || scene.visual}
                                    </div>
                                  </div>
                                )}

                                {scene.voiceover && (
                                  <div>
                                    <div className="text-sm text-white/40 mb-1">
                                      台詞
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed text-lime-200">
                                      {scene.voiceover}
                                    </div>
                                  </div>
                                )}

                                {scene.caption && (
                                  <div>
                                    <div className="text-sm text-white/40 mb-1">
                                      字幕
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed text-yellow-200">
                                      {scene.caption}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-bold text-cyan-300">爆款延伸</div>
                        <div className="text-sm text-white/50">
                          先生成 3 個延伸角度與 Hook，再選擇要不要生成完整腳本
                        </div>
                      </div>

                      <div className="text-xs text-white/50">
                        {plan === "PRO" || plan === "FLAGSHIP"
                          ? plan === "FLAGSHIP"
                            ? "旗艦版：每支影片可生成 3 個延伸腳本"
                            : "Pro：每支影片可生成 3 個延伸腳本"
                          : plan === "CREATOR"
                          ? "Creator：每支影片可生成 1 個延伸腳本"
                          : "Free：僅可查看分析，延伸腳本需升級"}
                      </div>
                    </div>

                    {nextAngles.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleGenerateAngles(item.id)}
                        disabled={anglesLoadingId === item.id}
                        className="px-4 py-3 rounded-xl bg-cyan-500 text-black font-bold"
                      >
                        {anglesLoadingId === item.id
                          ? "生成中..."
                          : "生成 3 個爆款延伸"}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm text-white/50">
                          已生成 3 個延伸角度。已生成延伸腳本：
                          <span className="ml-1 font-bold text-white">
                            {generatedAngleScriptCount}
                          </span>
                          /{angleScriptLimitPerVideo}
                        </div>

                        {nextAngles.map((angle) => {
                          const loadingKey = `${item.id}-${angle.id}`;
                          const canGenerate = canGenerateAngleScript(item, angle);

                          return (
                            <div
                              key={angle.id}
                              className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                  <div className="text-sm text-cyan-300 font-bold mb-1">
                                    角度 {angle.id}
                                  </div>
                                  <div className="font-bold text-white text-lg">
                                    {angle.angle}
                                  </div>
                                </div>

                                {angle.generatedScript ? (
                                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/20">
                                    已生成腳本
                                  </span>
                                ) : !canGenerate ? (
                                  <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/20">
                                    {plan === "FREE"
                                      ? "升級 Creator 才能生成"
                                      : "此影片延伸腳本額度已用完"}
                                  </span>
                                ) : null}
                              </div>

                              <div className="rounded-xl bg-white/5 p-3">
                                <div className="text-sm text-white/40 mb-1">Hook</div>
                                <div className="whitespace-pre-wrap leading-relaxed text-white/90">
                                  {angle.hook}
                                </div>
                              </div>

                              {angle.whyThisWorks && (
                                <div className="rounded-xl bg-white/5 p-3">
                                  <div className="text-sm text-white/40 mb-1">
                                    為什麼值得拍
                                  </div>
                                  <div className="whitespace-pre-wrap leading-relaxed text-white/80">
                                    {angle.whyThisWorks}
                                  </div>
                                </div>
                              )}

                              {!angle.generatedScript && (
                                <div className="flex items-center gap-3 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleGenerateAngleScript(item.id, angle.id)
                                    }
                                    disabled={
                                      angleScriptLoadingKey === loadingKey ||
                                      !canGenerate
                                    }
                                    className={`px-4 py-2 rounded-xl text-sm font-bold ${
                                      canGenerate
                                        ? "bg-brand-500 text-white"
                                        : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                                    }`}
                                  >
                                    {angleScriptLoadingKey === loadingKey
                                      ? "生成中..."
                                      : "生成完整腳本"}
                                  </button>

                                  {!canGenerate && plan === "CREATOR" && (
                                    <div className="text-xs text-amber-300">
                                      Creator 每支影片只能生成 1 個延伸腳本，升級 Pro 可解鎖 3 個
                                    </div>
                                  )}

                                  {!canGenerate && plan === "FREE" && (
                                    <div className="text-xs text-amber-300">
                                      升級 Creator 或 Pro 後即可使用延伸腳本
                                    </div>
                                  )}
                                </div>
                              )}

                              {angle.generatedScript && (
                                <details className="rounded-xl bg-white/5 p-4">
                                  <summary className="cursor-pointer font-medium text-white/90">
                                    查看延伸腳本
                                  </summary>

                                  <div className="mt-4 grid gap-4">
                                    <div className="rounded-xl bg-black/20 p-4">
                                      <div className="text-sm text-white/40 mb-2">
                                        Hook
                                      </div>
                                      <div className="whitespace-pre-wrap leading-relaxed text-white/95">
                                        {angle.generatedScript.hook || "未提供"}
                                      </div>
                                    </div>

                                    <div className="rounded-xl bg-black/20 p-4">
                                      <div className="text-sm text-white/40 mb-2">
                                        完整腳本
                                      </div>
                                      <div className="whitespace-pre-wrap leading-relaxed text-white/80">
                                        {angle.generatedScript.fullScript || "未提供"}
                                      </div>
                                    </div>

                                    <div className="rounded-xl bg-black/20 p-4">
                                      <div className="text-sm text-white/40 mb-2">
                                        CTA
                                      </div>
                                      <div className="whitespace-pre-wrap leading-relaxed text-amber-200">
                                        {angle.generatedScript.cta || "未提供"}
                                      </div>
                                    </div>

                                    {(angle.generatedScript.scenes || []).length > 0 && (
                                      <div className="rounded-xl bg-black/20 p-4 space-y-3">
                                        <div className="text-sm text-white/40">
                                          分鏡
                                        </div>

                                        {(angle.generatedScript.scenes || []).map(
                                          (scene, index) => (
                                            <div
                                              key={index}
                                              className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2"
                                            >
                                              <div className="font-bold text-purple-300">
                                                鏡頭 {index + 1}{" "}
                                                {scene.timeRange
                                                  ? `｜${scene.timeRange}`
                                                  : ""}
                                              </div>

                                              {scene.purpose && (
                                                <div className="text-sm text-purple-200/80">
                                                  用途：{scene.purpose}
                                                </div>
                                              )}

                                              {scene.visualContent && (
                                                <div>
                                                  <div className="text-sm text-white/40 mb-1">
                                                    畫面
                                                  </div>
                                                  <div className="whitespace-pre-wrap leading-relaxed">
                                                    {scene.visualContent}
                                                  </div>
                                                </div>
                                              )}

                                              {scene.voiceover && (
                                                <div>
                                                  <div className="text-sm text-white/40 mb-1">
                                                    台詞
                                                  </div>
                                                  <div className="whitespace-pre-wrap leading-relaxed text-lime-200">
                                                    {scene.voiceover}
                                                  </div>
                                                </div>
                                              )}

                                              {scene.caption && (
                                                <div>
                                                  <div className="text-sm text-white/40 mb-1">
                                                    字幕
                                                  </div>
                                                  <div className="whitespace-pre-wrap leading-relaxed text-yellow-200">
                                                    {scene.caption}
                                                  </div>
                                                </div>
                                              )}

                                              {scene.shootingTip && (
                                                <div>
                                                  <div className="text-sm text-white/40 mb-1">
                                                    拍攝提示
                                                  </div>
                                                  <div className="whitespace-pre-wrap leading-relaxed text-orange-200">
                                                    {scene.shootingTip}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <details className="rounded-xl bg-white/5 p-4">
                    <summary className="cursor-pointer font-medium text-white/90">
                      查看完整爆款分析
                    </summary>

                    <div className="mt-4 grid gap-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-black/20 p-4">
                          <div className="text-sm text-white/40 mb-2">目標受眾</div>
                          <div>{item.analysis?.targetAudience || "未提供"}</div>
                        </div>

                        <div className="rounded-xl bg-black/20 p-4">
                          <div className="text-sm text-white/40 mb-2">核心情緒</div>
                          <div>{item.analysis?.emotion || "未提供"}</div>
                        </div>

                        <div className="rounded-xl bg-black/20 p-4">
                          <div className="text-sm text-white/40 mb-2">CTA 類型</div>
                          <div>{item.analysis?.ctaType || "未提供"}</div>
                        </div>

                        <div className="rounded-xl bg-black/20 p-4">
                          <div className="text-sm text-white/40 mb-2">爆款公式</div>
                          <div className="leading-relaxed whitespace-pre-wrap">
                            {item.analysis?.combinedFormula || "未提供"}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-black/20 p-4">
                        <div className="text-sm text-white/40 mb-2">爆款原因</div>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {(item.analysis?.viralReasons || []).length > 0 ? (
                            item.analysis?.viralReasons?.map(
                              (reason: string, index: number) => (
                                <li key={index}>{reason}</li>
                              )
                            )
                          ) : (
                            <li>未提供</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl bg-black/20 p-4">
                        <div className="text-sm text-white/40 mb-2">痛點拆解</div>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {(item.analysis?.painPoints || []).length > 0 ? (
                            item.analysis?.painPoints?.map(
                              (point: string, index: number) => (
                                <li key={index}>{point}</li>
                              )
                            )
                          ) : (
                            <li>未提供</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl bg-black/20 p-4">
                        <div className="text-sm text-white/40 mb-2">關鍵洞察</div>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {(item.analysis?.keyInsights || []).length > 0 ? (
                            item.analysis?.keyInsights?.map(
                              (insight: string, index: number) => (
                                <li key={index}>{insight}</li>
                              )
                            )
                          ) : (
                            <li>未提供</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl bg-black/20 p-4">
                        <div className="text-sm text-white/40 mb-2">
                          合規 / 法規提醒
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {(item.analysis?.legalIssues || []).length > 0 ? (
                            item.analysis?.legalIssues?.map(
                              (issue: string, index: number) => (
                                <li key={index}>{issue}</li>
                              )
                            )
                          ) : (
                            <li>目前無特殊提醒</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </details>

                  <details className="rounded-xl bg-white/5 p-4">
                    <summary className="cursor-pointer font-medium text-white/80">
                      查看逐字稿
                    </summary>
                    <div className="mt-3 text-white/60 leading-relaxed whitespace-pre-wrap">
                      {item.transcript || "沒有逐字稿"}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GuestAccessModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
      />
    </>
  );
}