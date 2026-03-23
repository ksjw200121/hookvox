"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FIELD_GUIDE, INDUSTRIES_WITH_STORYBOARD, Industry } from "@/prompts";
import GuestAccessModal from "@/components/auth/GuestAccessModal";
import { emitUsageUpdated } from "@/lib/usage-events";
import { getAuthHeader as getAuthHeaderBase, authFetch } from "@/lib/auth-fetch";

type ScriptScene = {
  id?: number;
  timeRange?: string;
  visual?: string;
  visualContent?: string;
  voiceover?: string;
  caption?: string;
  purpose?: string;
  shootingTip?: string;
};

type ScriptItem = {
  version?: string;
  hook?: string;
  script?: string;
  fullScript?: string;
  igCaption?: string;
  cta?: string;
  scenes?: ScriptScene[];
};

type TitleGroup = {
  type: string;
  title: string;
};

type StoryboardScene = {
  id?: number;
  scene?: number;
  timeRange?: string;
  shotType?: string;
  visualContent?: string;
  voiceover?: string;
  caption?: string;
  shootingTip?: string;
  purpose?: string;
};

type AnalysisData = {
  coreTopic?: string;
  targetAudience?: string;
  summary?: string;
  hookStyle?: string;
  hookScore?: number;
  hookAnalysis?: string;
  viralPotential?: number;
  replicability?: number;
  emotionalTriggers?: string[];
  contentStructure?: string[];
  persuasionMechanics?: string[];
  viralReasons?: string[];
  keyAngles?: string[];
  ctaStyle?: string;
  keyFormula?: string;
  hook?: string;
  hookModel?: string;
  emotion?: string;
  painPoints?: string[];
  ctaType?: string;
  combinedFormula?: string;
  keyInsights?: string[];
  contentCategory?: string;
  generated?: {
    titles?: string[];
    titleGroups?: TitleGroup[];
    bestScriptVersion?: string;
    scripts?: ScriptItem[];
    storyboard?: StoryboardScene[];
    generatedAt?: string;
    updatedAt?: string;
  };
};

const BLOCKED_CATEGORIES = ["COMEDY", "DAILY_LIFE", "WORK_DIARY"];
const BLOCK_MESSAGE = `這類型的影片不會有人看 😔

搞笑、日常生活、工作日常這類影片，在粉絲破萬之前幾乎不會有流量。
因為陌生人不認識你，沒有理由看你的日常。

✅ 先做「利他」的內容：
提供資訊 + 情緒價值，讓陌生人覺得看完有收穫。
等粉絲累積到一萬以上，再嘗試這類型也不遲。

換一支有教學、分享知識、或解決問題的影片來分析吧！`;

const INDUSTRY_LABELS: Record<Industry, string> = {
  INSURANCE: "保險（專業知識）",
  REALESTATE: "房仲（專業知識）",
  BEAUTY_CLIENT: "美業",
  FITNESS: "健身",
  CONSULTANT: "顧問",
  RECIPE: "食譜",
  TRAVEL: "旅遊",
  RESTAURANT: "探店",
  ASTROLOGY: "星座",
  CONVENIENCE: "超商開箱",
  MAKEUP: "化妝",
  GENERAL: "通用",
};

const PURPOSE_COLORS: Record<string, string> = {
  鉤子: "#ef4444",
  建立共鳴: "#f59e0b",
  "建立共鳴/痛點": "#f59e0b",
  核心內容: "#3b82f6",
  "核心內容/乾貨": "#3b82f6",
  "高潮/轉折": "#a855f7",
  高潮: "#a855f7",
  CTA: "#4ade80",
};

// 手機選檔常常拿不到副檔名，直接放寬為 audio/video 類型，
// 避免 iOS HEVC 或相簿匯出的檔案在選取階段就被擋掉。
const ACCEPTED_FILE_TYPES = "audio/*,video/*,.mp3,.mp4,.m4a,.m4v,.wav,.webm,.ogg,.flac,.mpeg,.mpga";
// 小檔直接送 API（請求 body 上限約 4.5 MB，base64 約 1.33 倍 → 約 3 MB）
const MAX_INLINE_MB = 3;
const MAX_INLINE_BYTES = MAX_INLINE_MB * 1024 * 1024;
// Whisper 單檔上限約 25MB，這裡保守抓 24MB，避免使用者上傳後才在後端失敗。
const MAX_UPLOAD_MB = 24;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API 沒有回傳 JSON：${text.slice(0, 200)}`);
  }
}

// Use centralized getAuthHeader from auth-fetch.ts (handles mobile WebView retries)
const getAuthHeader = getAuthHeaderBase;

async function refreshUsageAndBroadcast() {
  const authHeader = await getAuthHeader();
  if (!authHeader?.Authorization) return;

  const res = await fetch("/api/usage", { method: "GET", headers: { ...authHeader } });
  if (!res.ok) return;

  const data = await readJsonSafe(res);
  emitUsageUpdated(data || {});
}

function normalizeScripts(rawScripts: any[]): ScriptItem[] {
  return (rawScripts || []).map((script: any) => ({
    ...script,
    fullScript: script?.script || script?.fullScript || "",
    scenes: (script?.scenes || []).map((scene: any) => ({
      ...scene,
      visualContent: scene?.visualContent || scene?.visual || "",
      shootingTip: scene?.shootingTip || scene?.purpose || "",
      caption: scene?.caption || "",
    })),
  }));
}

function getUrlValidationMessage(url: string) {
  const v = url.trim().toLowerCase();
  if (!v) return "";

  if (
    v.includes("instagram.com") ||
    v.includes("tiktok.com") ||
    v.includes("vm.tiktok.com")
  ) {
    return "IG Reels / TikTok 目前不支援網址分析，請改用「上傳音訊 / 影片」或「貼逐字稿」。";
  }

  if (v.includes("youtube.com/watch")) {
    return "目前網址分析僅支援 YouTube Shorts，不支援一般 YouTube 長影片。";
  }

  if (v.includes("youtube.com") && !v.includes("/shorts/")) {
    return "目前網址分析僅支援 YouTube Shorts 連結。";
  }

  if (v.includes("youtu.be/")) {
    return "請改貼完整的 YouTube Shorts 連結，例如 youtube.com/shorts/...。";
  }

  return "";
}

type InputMode = "url" | "transcript" | "upload";

export default function AnalyzePage() {
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [url, setUrl] = useState("");
  const [pasteTranscript, setPasteTranscript] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [industry, setIndustry] = useState<Industry>("GENERAL");
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [ctaGoal, setCtaGoal] = useState("留言+1");
  const [substitution, setSubstitution] = useState("");
  const [wantStoryboard, setWantStoryboard] = useState(false);

  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [usageLimitReached, setUsageLimitReached] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [titleGroups, setTitleGroups] = useState<TitleGroup[]>([]);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [activeScript, setActiveScript] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [usedCache, setUsedCache] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [showAnalyzeConfirm, setShowAnalyzeConfirm] = useState(false);
  const [showOnboardAnalyze, setShowOnboardAnalyze] = useState(false);

  const guide = FIELD_GUIDE[industry];
  const isStoryboardIndustry = INDUSTRIES_WITH_STORYBOARD.includes(industry);
  const urlValidationMessage = getUrlValidationMessage(url);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsGuest(!session?.access_token);
    }
    loadSession();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("hookvox_onboard_analyze_seen")) {
      setShowOnboardAnalyze(true);
    }
  }, []);

  const resetResults = () => {
    setTranscript("");
    setAnalysis(null);
    setScripts([]);
    setTitles([]);
    setTitleGroups([]);
    setStoryboard([]);
    setActiveScript(0);
    setBlocked(false);
    setUsageLimitReached(false);
    setUsedCache(false);
    setSavedNotice("");
    setError("");
  };

  const handleFileUpload = (file: File) => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }

    setUploadError("");
    setError("");
    setUsageLimitReached(false);

    const rawName = String(file.name || "");
    const lastDot = rawName.lastIndexOf(".");
    const fileExt = lastDot > 0 ? rawName.slice(lastDot + 1).toLowerCase() : "";
    const knownMediaExts = [
      "mp3",
      "mpeg",
      "m4a",
      "m4v",
      "wav",
      "mp4",
      "mov",
      "webm",
      "ogg",
      "flac",
    ];
    const clearlyUnsupportedExts = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "zip",
      "rar",
      "7z",
      "txt",
      "json",
      "csv",
    ];

    const hasMime = !!file.type;
    const hasExt = !!fileExt;
    const mimeLower = (file.type || "").toLowerCase();
    const isMediaMime = mimeLower.startsWith("audio/") || mimeLower.startsWith("video/");
    const isKnownMediaExt = hasExt && knownMediaExts.includes(fileExt);
    const isClearlyUnsupportedExt = hasExt && clearlyUnsupportedExts.includes(fileExt);

    // 手機相簿常回傳奇怪 mime（例如 video/hevc）或甚至沒有副檔名，
    // 這裡改成只擋「很明確不是音訊/影片」的檔案，其他先放行。
    const shouldReject =
      (!isMediaMime && !isKnownMediaExt && isClearlyUnsupportedExt) ||
      (hasMime && !isMediaMime && !hasExt);

    if (shouldReject) {
      setUploadError("不支援的檔案格式，請上傳 mp3 / mp4 / mov / m4a / wav / webm 等音訊或影片檔案。");
      setUploadFile(null);
      setUploadSuccess(false);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`檔案超過 ${MAX_UPLOAD_MB}MB。請先壓縮影片後再上傳，或改用「貼上逐字稿」/ YouTube Shorts 網址。`);
      setUploadFile(null);
      setUploadSuccess(false);
      return;
    }

    setUploadFile(file);
    setUploadSuccess(true);
    setUploadError("");
    setPasteTranscript("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const runAnalyze = async () => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }

    try {
      setError("");
      setBlocked(false);
      setLoadingAnalyze(true);
      resetResults();

      let effectiveAuthHeader = await getAuthHeader();

      let body: Record<string, any> = {};

      if (inputMode === "url") {
        if (!url.trim()) {
          setError("請貼上 YouTube Shorts 連結");
          return;
        }
        if (urlValidationMessage) {
          setError(urlValidationMessage);
          return;
        }
        body = { url };
      } else if (inputMode === "transcript") {
        if (!pasteTranscript.trim()) {
          setError("請貼上逐字稿內容");
          return;
        }
        body = { transcript: pasteTranscript };
      } else if (inputMode === "upload" && uploadFile) {
        // Ensure we have a valid session — retry once for mobile WebView race condition
        if (!effectiveAuthHeader.Authorization) {
          await new Promise((r) => setTimeout(r, 150));
          effectiveAuthHeader = await getAuthHeader();
        }
        if (!effectiveAuthHeader.Authorization) {
          setError("請先登入再上傳檔案");
          setLoadingAnalyze(false);
          if (typeof window !== "undefined") {
            window.location.href = `/login?redirect=${encodeURIComponent("/analyze")}`;
          }
          return;
        }

        const rawName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const lastDot = rawName.lastIndexOf(".");
        const ext = lastDot >= 0 ? rawName.slice(lastDot) : "";

        const normalizedExt = String(ext || "")
          .replace(/^\./, "")
          .toLowerCase();
        const videoExts = ["mp4", "webm"];
        const mimeLower = (uploadFile.type || "").toLowerCase();
        const isVideoByMime = mimeLower.startsWith("video/");
        const isVideoByExt = videoExts.includes(normalizedExt);
        // 若 mime 與副檔名都未知（例如手機選檔只給檔名），預設當影片。
        const isVideo = isVideoByMime || isVideoByExt || (!mimeLower && !normalizedExt);
        const inferContentType = () => {
          const t = (uploadFile.type || "").toLowerCase();
          if (t) return t;
          if (normalizedExt === "mp3" || normalizedExt === "mpeg") return "audio/mpeg";
          if (normalizedExt === "m4a") return "audio/mp4";
          if (normalizedExt === "wav") return "audio/wav";
          if (normalizedExt === "ogg") return "audio/ogg";
          if (normalizedExt === "flac") return "audio/flac";
          if (normalizedExt === "webm") return "video/webm";
          if (normalizedExt === "mp4") return "video/mp4";
          return isVideo ? "video/mp4" : "audio/mpeg";
        };
        const contentType = inferContentType();

        if (uploadFile.size <= MAX_INLINE_BYTES) {
          const buffer = await uploadFile.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const chunkSize = 8192;
          let binary = "";
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64 = btoa(binary);
          body = isVideo ? { videoBase64: base64 } : { audioBase64: base64 };
        } else {
          // Use authFetch for signed URL request (auto-retries on 401)
          const signRes = await authFetch("/api/analyze/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: uploadFile.name || "video",
              contentType,
            }),
          });
          const signData = await readJsonSafe(signRes);
          if (!signRes.ok) {
            setError(signData?.error || "無法建立上傳連結，請稍後再試");
            setLoadingAnalyze(false);
            return;
          }

          const signedUrl = String(signData?.signedUrl || signData?.signedURL || "").trim();
          const storagePath = String(signData?.storagePath || signData?.path || "").trim();

          if (!signedUrl || !storagePath) {
            setError("上傳連結無效，請稍後再試");
            setLoadingAnalyze(false);
            return;
          }

          // Upload to Supabase Storage with one retry on failure
          let uploadRes = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: uploadFile,
          });

          if (!uploadRes.ok) {
            // Retry once — transient network issues on mobile are common
            await new Promise((r) => setTimeout(r, 500));
            uploadRes = await fetch(signedUrl, {
              method: "PUT",
              headers: { "Content-Type": contentType },
              body: uploadFile,
            });
          }

          if (!uploadRes.ok) {
            setError("大檔上傳失敗，請確認網路穩定後再試");
            setLoadingAnalyze(false);
            return;
          }

          body = { storagePath };
        }
      } else {
        setError("請先上傳音訊或影片檔案，再按「開始爆款分析」");
        return;
      }

      // Refresh auth header right before the main analyze call
      // to minimize window for token expiry
      effectiveAuthHeader = await getAuthHeader();
      if (!effectiveAuthHeader.Authorization) {
        setError("登入狀態已失效，請重新登入後再試");
        setLoadingAnalyze(false);
        if (typeof window !== "undefined") {
          window.location.href = `/login?redirect=${encodeURIComponent("/analyze")}`;
        }
        return;
      }

      // Use authFetch for the main analyze call (auto-retries on 401)
      const res = await authFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await readJsonSafe(res);

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = `/login?redirect=${encodeURIComponent("/analyze")}`;
        }
        return;
      }
      if (res.status === 403 && data?.upgradeRequired) {
        setUsageLimitReached(true);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "分析失敗");

      const a: AnalysisData = data?.analysis || null;
      setTranscript(data?.transcript || pasteTranscript || "");
      setAnalysis(a);
      refreshUsageAndBroadcast();

      if (a?.contentCategory && BLOCKED_CATEGORIES.includes(a.contentCategory)) {
        setBlocked(true);
      }

      const generated = a?.generated;
      if (generated) {
        const normalizedScripts = normalizeScripts(generated?.scripts || []);
        setScripts(normalizedScripts);
        setTitles(generated?.titles || []);
        setTitleGroups(generated?.titleGroups || []);
        setStoryboard(generated?.storyboard || []);
        if ((generated?.titles || []).length > 0 || (generated?.scripts || []).length > 0) {
          setSavedNotice("這支影片之前已生成過內容，可直接到爆款資料庫查看。");
        }
      }

      if (data?.cached) {
        setSavedNotice("這支影片你之前已分析過，已直接讀取舊資料。");
      }
    } catch (err: any) {
      const msg = err?.message || "分析失敗";
      if (typeof msg === "string" && (msg.includes("Request Entity Too Large") || msg.includes("PAYLOAD_TOO_LARGE"))) {
        setError("檔案過大。若為大檔請重新整理後再試（會改走 Storage 上傳）；或改用「貼上逐字稿」/ YouTube Shorts 網址。");
      } else {
        setError(msg);
      }
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const onAnalyzeClick = () => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    if (!canAnalyze) return;
    setShowAnalyzeConfirm(true);
  };

  const onConfirmAnalyze = () => {
    setShowAnalyzeConfirm(false);
    runAnalyze();
  };

  const generateContent = async () => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    if (blocked) return;

    try {
      setError("");
      setUsageLimitReached(false);
      setUsedCache(false);
      setSavedNotice("");
      setLoadingGenerate(true);
      setScripts([]);
      setTitles([]);
      setTitleGroups([]);
      setStoryboard([]);
      setActiveScript(0);

      const authHeader = await getAuthHeader();
      const shouldGenerateStoryboard = wantStoryboard || isStoryboardIndustry;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          url,
          industry,
          topic: topic || analysis?.coreTopic || "",
          targetAudience: targetAudience || analysis?.targetAudience || "",
          ctaGoal,
          analysis,
          substitution,
          transcript,
          userTopic: substitution || topic || "",
          wantStoryboard: shouldGenerateStoryboard,
        }),
      });

      const data = await readJsonSafe(res);

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = `/login?redirect=${encodeURIComponent("/analyze")}`;
        }
        return;
      }
      if (res.status === 403 && data?.upgradeRequired) {
        setUsageLimitReached(true);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "生成失敗");

      const normalizedScripts = normalizeScripts(data?.scripts || []);
      const nextTitles = data?.titles || [];
      const nextTitleGroups = data?.titleGroups || [];

      const best = shouldGenerateStoryboard
        ? normalizedScripts.find((s: any) => s.version === data?.bestScriptVersion) || normalizedScripts[0]
        : null;

      const nextStoryboard = data?.storyboard?.length > 0 ? data.storyboard : best?.scenes || [];

      setScripts(normalizedScripts);
      setTitles(nextTitles);
      setTitleGroups(nextTitleGroups);
      setStoryboard(nextStoryboard);
      setUsedCache(Boolean(data?.cached));
      setSavedNotice("內容已保存，可到爆款資料庫查看。");
      refreshUsageAndBroadcast();

      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          generated: {
            titles: nextTitles,
            titleGroups: nextTitleGroups,
            bestScriptVersion: data?.bestScriptVersion || "",
            scripts: normalizedScripts,
            storyboard: nextStoryboard,
            generatedAt: prev.generated?.generatedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      });
    } catch (err: any) {
      setError(err?.message || "生成失敗");
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleCopyTitle = (title: string, index: number) => {
    copyText(title);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleCopyField = (text: string, field: string) => {
    copyText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const canAnalyze =
    inputMode === "url"
      ? !!url.trim() && !urlValidationMessage
      : inputMode === "transcript"
      ? !!pasteTranscript.trim()
      : inputMode === "upload"
      ? !!uploadFile
      : false;

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          padding: "40px 20px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Hookvox</h1>
          <p style={{ color: "#555", marginBottom: 32, fontSize: 14 }}>
            分析爆款影片的公式，套用到你自己的內容
          </p>

          {isGuest && (
            <div
              style={{
                marginBottom: 24,
                padding: "16px 18px",
                borderRadius: 12,
                background: "#120909",
                border: "1px solid #3f1212",
                color: "#fca5a5",
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>目前為訪客模式</div>
              <div style={{ fontSize: 14, color: "#f5b4b4" }}>
                你可以先查看分析頁介面與填寫欄位，但真正執行分析、生成腳本仍需先註冊或登入。
              </div>
            </div>
          )}

          {!isGuest && showOnboardAnalyze && (
            <div
              style={{
                marginBottom: 24,
                padding: "16px 18px",
                borderRadius: 12,
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#86efac",
                lineHeight: 1.6,
                fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>👋 第一次使用？</div>
              <div style={{ marginBottom: 12 }}>
                建議流程：上傳影片或貼網址 → 按「開始爆款分析」→ 完成後再按「生成腳本與標題」，就能把爆款套成你的內容。
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("hookvox_onboard_analyze_seen", "1");
                  }
                  setShowOnboardAnalyze(false);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "rgba(34, 197, 94, 0.3)",
                  color: "#fff",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                知道了
              </button>
            </div>
          )}

          <StepCard step={1} title="選擇分析來源">
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <div onClick={() => setInputMode("upload")}>
                <TabBtn active={inputMode === "upload"}>上傳音訊 / 影片</TabBtn>
              </div>
              <div onClick={() => setInputMode("transcript")}>
                <TabBtn active={inputMode === "transcript"}>貼逐字稿</TabBtn>
              </div>
              <div onClick={() => setInputMode("url")}>
                <TabBtn active={inputMode === "url"}>YouTube Shorts 連結</TabBtn>
              </div>
            </div>

            {inputMode === "upload" && (
              <div>
                <FieldBlock
                  label="上傳音訊或影片"
                  hint={`支援 mp3 / mp4 / m4a / wav / webm 等；.mov 請先轉成 mp4。單檔建議壓到 ${MAX_UPLOAD_MB}MB 以下，分析完成後自動刪除。上傳後按「開始爆款分析」。`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "2px dashed #333",
                      borderRadius: 10,
                      padding: "32px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#050505",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#333";
                    }}
                  >
                    {uploadSuccess && uploadFile ? (
                      <div>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                        <div style={{ color: "#4ade80", fontSize: 14, fontWeight: 600 }}>
                          {uploadFile.name}
                        </div>
                        <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
                          檔案已上傳完成
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
                        <div style={{ color: "#888", fontSize: 14 }}>點擊選擇檔案</div>
                        <div style={{ color: "#ef4444", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
                          單檔上限 {MAX_UPLOAD_MB}MB（超過請先壓縮）
                        </div>
                        <div style={{ color: "#444", fontSize: 12, marginTop: 4 }}>
                          mp3 / mp4 / m4a / wav / webm（.mov 請先轉 mp4）
                        </div>
                      </div>
                    )}
                  </div>
                </FieldBlock>

                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "#0b1220",
                    border: "1px solid #1d4ed8",
                    color: "#bfdbfe",
                    fontSize: 13,
                    lineHeight: 1.7,
                    marginTop: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>上傳前先看這裡</div>
                  <div>
                    目前轉錄服務單檔上限約 25MB，為了避免上傳後才失敗，建議先壓到 {MAX_UPLOAD_MB}MB 以下。
                    若你是手機原始影片（常見 HEVC / 1080p / 60fps），請先用剪映 / CapCut 輸出成 720p、30fps、mp4。
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Link href="/guide#upload-files" style={{ color: "#93c5fd", textDecoration: "underline" }}>
                      查看壓縮影片教學
                    </Link>
                  </div>
                </div>

                {uploadError && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: "#2a0909",
                      border: "1px solid #7f1d1d",
                      color: "#fca5a5",
                      fontSize: 14,
                      marginTop: -8,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ {uploadError}</div>
                    </div>
                  </div>
                )}

                {uploadSuccess && uploadFile && !uploadError && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "#071207",
                      border: "1px solid #166534",
                      color: "#86efac",
                      fontSize: 13,
                      marginTop: -8,
                    }}
                  >
                    檔案已上傳完成。請按下方「開始爆款分析」進行轉錄與分析。
                  </div>
                )}
              </div>
            )}

            {inputMode === "transcript" && (
              <FieldBlock
                label="逐字稿"
                hint="直接貼上影片逐字稿、腳本或文字稿，AI 會直接分析爆款公式。"
              >
                <textarea
                  value={pasteTranscript}
                  onChange={(e) => setPasteTranscript(e.target.value)}
                  placeholder="把逐字稿貼在這裡，不需要影片連結..."
                  rows={8}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                />
              </FieldBlock>
            )}

            {inputMode === "url" && (
              <>
                <FieldBlock
                  label="YouTube Shorts 連結"
                  hint="目前僅支援 YouTube Shorts 網址分析。IG Reels / TikTok 請改用「貼逐字稿」或「上傳音訊 / 影片」。"
                >
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/shorts/xxxxx"
                    style={inputStyle}
                  />
                </FieldBlock>

                {urlValidationMessage && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "#1a0a00",
                      border: "1px solid #9a3412",
                      color: "#fdba74",
                      fontSize: 13,
                      marginTop: -8,
                    }}
                  >
                    {urlValidationMessage}
                  </div>
                )}
              </>
            )}
          </StepCard>

          <StepCard step={2} title="填寫你的內容設定">
            <p style={{ color: "#555", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              這些設定讓 AI 知道要幫你寫什麼內容。
              <strong style={{ color: "#aaa" }}> 主題和受眾可以留空</strong>
              ，系統會從分析結果自動帶入。
            </p>

            <FieldBlock
              label="產業"
              hint={`選擇最接近你的行業。${
                isStoryboardIndustry ? "✅ 這個行業會自動生成分鏡表。" : "這個行業不預設生成分鏡，可在下方手動勾選。"
              }`}
            >
              <select
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value as Industry);
                  setWantStoryboard(false);
                }}
                style={inputStyle}
              >
                {(Object.entries(INDUSTRY_LABELS) as [Industry, string][]).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                    {INDUSTRIES_WITH_STORYBOARD.includes(val) ? " 📋" : ""}
                  </option>
                ))}
              </select>
            </FieldBlock>

            <FieldBlock label="主題（選填）" hint={guide.topic}>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={guide.topicPlaceholder}
                style={inputStyle}
              />
            </FieldBlock>

            <FieldBlock label="目標受眾（選填）" hint={guide.audience}>
              <input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder={guide.audiencePlaceholder}
                style={inputStyle}
              />
            </FieldBlock>

            <FieldBlock label="CTA 目標" hint={guide.cta}>
              <input
                value={ctaGoal}
                onChange={(e) => setCtaGoal(e.target.value)}
                placeholder={guide.ctaPlaceholder}
                style={inputStyle}
              />
            </FieldBlock>

            {!isStoryboardIndustry && (
              <div
                style={{
                  marginTop: 8,
                  padding: "12px 16px",
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
                onClick={() => setWantStoryboard(!wantStoryboard)}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `2px solid ${wantStoryboard ? "#60a5fa" : "#444"}`,
                    background: wantStoryboard ? "#1e3a5f" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {wantStoryboard && <span style={{ color: "#60a5fa", fontSize: 14 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>📋 我也要分鏡表</div>
                  <div style={{ color: "#555", fontSize: 12, marginTop: 2 }}>
                    根據 AI 選出的最佳版本自動生成拍攝分鏡
                  </div>
                </div>
              </div>
            )}
          </StepCard>

          <StepCard step={3} title="套用到你的主題" accent="#0a160a" border="#166534">
            <div style={{ background: "#0a1a0a", border: "1px solid #166534", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ color: "#4ade80", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                🎯 這一步決定腳本的品質！
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#4ade80", fontSize: 13, flexShrink: 0 }}>✅</span>
                  <p style={{ color: "#86efac", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: "#4ade80" }}>有填主題（推薦）</strong>：AI 會把爆款影片的「結構和手法」套用到你填的主題上，產出完全屬於你的原創腳本。
                    <span style={{ color: "#6ee7b7" }}> 填越詳細，腳本越精準。</span>
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#fbbf24", fontSize: 13, flexShrink: 0 }}>⚡</span>
                  <p style={{ color: "#d4d4d4", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: "#fbbf24" }}>沒填主題</strong>：AI 會用原影片的同一主題，但用 3 種完全不同的切角重新創作（例如換成數字型、恐懼型、故事型）。
                  </p>
                </div>
              </div>
            </div>

            <FieldBlock label="你要套用的主題是什麼？" hint={guide.substitution}>
              <input
                value={substitution}
                onChange={(e) => setSubstitution(e.target.value)}
                placeholder={guide.substitutionPlaceholder}
                style={{ ...inputStyle, borderColor: "#166534", background: "#050f05" }}
              />
            </FieldBlock>

            <div style={{ background: "#111", borderRadius: 10, padding: 14, marginTop: 12 }}>
              <p style={{ color: "#a3a3a3", fontSize: 12, margin: 0, lineHeight: 1.7 }}>
                💡 <strong style={{ color: "#d4d4d4" }}>怎麼填效果最好？</strong><br />
                ・只填關鍵字也行：<span style={{ color: "#86efac" }}>「牛排」「租屋補助」「醫美」</span><br />
                ・填詳細一點更好：<span style={{ color: "#86efac" }}>「台北東區新開的韓式燒肉店，主打一人份套餐」</span><br />
                ・給越多細節，AI 生成的腳本就越貼近你要的內容
              </p>
            </div>
          </StepCard>

          <div style={{ marginTop: 4, marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={onAnalyzeClick}
                disabled={loadingAnalyze || !canAnalyze}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  padding: "14px 28px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  opacity: loadingAnalyze || !canAnalyze ? 0.5 : 1,
                }}
              >
                {loadingAnalyze ? "⏳ 分析中..." : isGuest ? "🔒 先登入再分析" : "開始爆款分析"}
              </button>
              {loadingAnalyze && (
                <span style={{ fontSize: 13, color: "#888" }}>約需 1～2 分鐘，請勿關閉頁面</span>
              )}

            <button
              onClick={generateContent}
              disabled={loadingGenerate || (!analysis && !isGuest) || blocked}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "14px 28px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
                opacity: loadingGenerate || (!analysis && !isGuest) || blocked ? 0.5 : 1,
              }}
            >
              {loadingGenerate
                ? "⏳ 生成中..."
                : isGuest
                ? "🔒 先登入再生成腳本"
                : substitution
                ? `✨ 套用到「${substitution}」`
                : "✨ 生成腳本和標題"}
            </button>
            {loadingGenerate && (
              <span style={{ fontSize: 13, color: "#888" }}>約需 30 秒～1 分鐘，請稍候</span>
            )}

            {usedCache && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  borderRadius: 10,
                  background: "#0a160a",
                  border: "1px solid #166534",
                  color: "#86efac",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                已讀取先前生成內容，未重複扣次數
              </div>
            )}
            </div>
            <p style={{ color: "#666", fontSize: 13, marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
              系統會先轉錄影片，再進行爆款結構分析。此步驟會消耗 1 次分析額度。生成內容會另外消耗生成次數。
            </p>
          </div>

          {showAnalyzeConfirm && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 20,
              }}
              onClick={() => setShowAnalyzeConfirm(false)}
            >
              <div
                style={{
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: 14,
                  padding: 24,
                  maxWidth: 440,
                  width: "100%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>開始分析影片</h3>
                <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
                  系統會先將影片轉錄為逐字稿，接著進行爆款結構分析。
                  <strong style={{ color: "#f87171" }}> 此步驟會消耗 1 次分析額度。</strong>
                  <br /><br />
                  分析完成後，你可以：
                  <br />• 查看完整逐字稿
                  <br />• 查看爆款結構解析
                  <br />• 選擇是否生成腳本、標題或分鏡
                  <br /><br />
                  生成內容會消耗生成次數。
                  <br />
                  確定要開始分析嗎？
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowAnalyzeConfirm(false)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "transparent",
                      color: "#888",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={onConfirmAnalyze}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      border: "none",
                      background: "#ef4444",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    開始分析
                  </button>
                </div>
              </div>
            </div>
          )}

          {savedNotice && (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: "#07120a",
                color: "#86efac",
                border: "1px solid #166534",
                marginBottom: 24,
              }}
            >
              {savedNotice}
            </div>
          )}

          {usageLimitReached && !uploadError && (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                background: "#1a0a00",
                color: "#fb923c",
                border: "1px solid #9a3412",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>⚠️ 本月免費次數已用完</div>
                <div style={{ fontSize: 14, color: "#fdba74" }}>
                  升級方案即可繼續使用，每月可用次數大幅增加。
                </div>
              </div>
              <Link
                href="/plans"
                style={{
                  background: "#ea580c",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                立即升級 →
              </Link>
            </div>
          )}

          {blocked && (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                background: "#1a1a00",
                color: "#fbbf24",
                border: "1px solid #854d0e",
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
                marginBottom: 24,
              }}
            >
              {BLOCK_MESSAGE}
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                background: "#3b0a0a",
                color: "#fca5a5",
                border: "1px solid #7f1d1d",
                marginBottom: 24,
              }}
            >
              <div style={{ marginBottom: 8 }}>{error}</div>
              <div style={{ fontSize: 13, color: "#f5b4b4", marginBottom: 10 }}>
                若為額度不足請至方案頁升級；若為網路或系統問題可重試或聯絡 ksjw200121@gmail.com
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link
                  href="/plans"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "#b91c1c",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  查看方案
                </Link>
                <button
                  type="button"
                  onClick={() => setError("")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.15)",
                    color: "#fca5a5",
                    fontWeight: 600,
                    fontSize: 14,
                    border: "1px solid #7f1d1d",
                    cursor: "pointer",
                  }}
                >
                  關閉
                </button>
              </div>
            </div>
          )}

          {transcript && (
            <Section title="逐字稿">
              <div style={cardStyle}>{transcript}</div>
            </Section>
          )}

          {analysis && !blocked && (
            <Section title="爆款分析">
              <div style={{ display: "grid", gap: 10 }}>
                <AnalCard label="核心主題" value={analysis.coreTopic} />
                <AnalCard label="目標受眾" value={analysis.targetAudience} />

                {(analysis.hookScore || analysis.viralPotential || analysis.replicability) && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {analysis.hookScore && (
                      <ScoreCard label="⚡ 開頭吸引力" score={analysis.hookScore} color="#ef4444" />
                    )}
                    {analysis.viralPotential && (
                      <ScoreCard label="🔥 爆款潛力" score={analysis.viralPotential} color="#f59e0b" />
                    )}
                    {analysis.replicability && (
                      <ScoreCard label="♻️ 可複製性" score={analysis.replicability} color="#3b82f6" />
                    )}
                  </div>
                )}

                <AnalCard label="Hook 類型" value={analysis.hookStyle || analysis.hookModel} />
                {analysis.hookAnalysis && <AnalCard label="開頭分析" value={analysis.hookAnalysis} />}
                <AnalCard label="爆款原因" list={analysis.viralReasons} />
                <AnalCard label="情緒觸發點" list={analysis.emotionalTriggers} />
                <AnalCard label="內容結構" list={analysis.contentStructure} />
                <AnalCard label="說服機制" list={analysis.persuasionMechanics} />
                <AnalCard label="可借用角度" list={analysis.keyAngles} />
                <AnalCard label="CTA 類型" value={analysis.ctaStyle || analysis.ctaType} />
                <AnalCard label="爆款公式" value={analysis.keyFormula || analysis.combinedFormula} highlight />
                {analysis.painPoints && <AnalCard label="痛點" list={analysis.painPoints} />}
                {analysis.keyInsights && <AnalCard label="關鍵洞察" list={analysis.keyInsights} />}
              </div>
            </Section>
          )}

          {(titles.length > 0 || titleGroups.length > 0) && (
            <section style={{ marginTop: 48 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 4, height: 24, background: "#ef4444", borderRadius: 2 }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>爆款標題</h2>
                <span
                  style={{
                    background: "#1a0a0a",
                    border: "1px solid #3f1212",
                    color: "#f87171",
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {titles.length || titleGroups.length} 個
                </span>
              </div>

              {titleGroups.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {titleGroups.map((group, index) => (
                    <div
                      key={index}
                      onClick={() => handleCopyTitle(group.title, index)}
                      style={{
                        background: "#080808",
                        border: `1px solid ${copiedIndex === index ? "#ef4444" : "#1e1e1e"}`,
                        borderRadius: 10,
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#ef4444",
                          background: "#1a0a0a",
                          border: "1px solid #3f1212",
                          padding: "2px 8px",
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {group.type}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: "#f5f5f5",
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        {group.title}
                      </span>
                      <span style={{ color: copiedIndex === index ? "#4ade80" : "#333", fontSize: 12, flexShrink: 0 }}>
                        {copiedIndex === index ? "✓ 已複製" : "點擊複製"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {titles.map((title, index) => (
                    <div
                      key={index}
                      onClick={() => handleCopyTitle(title, index)}
                      style={{
                        background: "#080808",
                        border: `1px solid ${copiedIndex === index ? "#ef4444" : "#1e1e1e"}`,
                        borderRadius: 10,
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#3f1212",
                          background: "#1a0a0a",
                          border: "1px solid #3f1212",
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "#f5f5f5", lineHeight: 1.5, flex: 1 }}>
                        {title}
                      </span>
                      <span style={{ color: copiedIndex === index ? "#4ade80" : "#333", fontSize: 12, flexShrink: 0 }}>
                        {copiedIndex === index ? "✓ 已複製" : "點擊複製"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {scripts.length > 0 && (
            <section style={{ marginTop: 48 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ width: 4, height: 24, background: "#2563eb", borderRadius: 2 }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>腳本版本</h2>
                {substitution && (
                  <span
                    style={{
                      fontSize: 13,
                      color: "#4ade80",
                      background: "#0a1f0a",
                      border: "1px solid #166534",
                      padding: "3px 12px",
                      borderRadius: 20,
                    }}
                  >
                    → 套用：{substitution}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {scripts.map((script, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveScript(index)}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      border: activeScript === index ? "1px solid #2563eb" : "1px solid #1e1e1e",
                      background: activeScript === index ? "#0c1a3a" : "#080808",
                      color: activeScript === index ? "#60a5fa" : "#555",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: activeScript === index ? 700 : 400,
                    }}
                  >
                    {script?.version || String.fromCharCode(65 + index)}
                  </button>
                ))}
              </div>

              {scripts[activeScript] && (
                <div
                  style={{
                    background: "#050505",
                    border: "1px solid #1e1e1e",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 24px",
                      borderBottom: "1px solid #111",
                      background: "#0a0a0a",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      {scripts[activeScript]?.version || String.fromCharCode(65 + activeScript)}
                    </span>
                    <span style={{ color: "#333", fontSize: 13 }}>點擊區塊可複製</span>
                  </div>

                  <div style={{ padding: 24, display: "grid", gap: 16 }}>
                    <div
                      onClick={() => handleCopyField(scripts[activeScript]?.hook || "", "hook")}
                      style={{
                        background: "#0a160a",
                        border: "1px solid #166534",
                        borderRadius: 10,
                        padding: 18,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                        ⚡ 開場鉤子（前3秒）{copiedField === "hook" ? " ✓ 已複製" : ""}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.6 }}>
                        {scripts[activeScript]?.hook}
                      </div>
                    </div>

                    <div
                      onClick={() => handleCopyField(scripts[activeScript]?.fullScript || "", "script")}
                      style={{
                        background: "#080808",
                        border: "1px solid #1e1e1e",
                        borderRadius: 10,
                        padding: 18,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                        📄 完整腳本{copiedField === "script" ? " ✓ 已複製" : ""}
                      </div>
                      <div style={{ fontSize: 15, color: "#d4d4d4", lineHeight: 2, whiteSpace: "pre-wrap" }}>
                        {scripts[activeScript]?.fullScript}
                      </div>
                    </div>

                    {scripts[activeScript]?.igCaption && (
                      <div
                        onClick={() => handleCopyField(scripts[activeScript]?.igCaption || "", "ig")}
                        style={{
                          background: "#0a0a1a",
                          border: "1px solid #1e2a5f",
                          borderRadius: 10,
                          padding: 18,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ color: "#818cf8", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                          📱 IG 貼文文案{copiedField === "ig" ? " ✓ 已複製" : ""}
                        </div>
                        <div style={{ fontSize: 14, color: "#c7d2fe", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                          {scripts[activeScript]?.igCaption}
                        </div>
                      </div>
                    )}

                    <div
                      onClick={() => handleCopyField(scripts[activeScript]?.cta || "", "cta")}
                      style={{
                        background: "#120a00",
                        border: "1px solid #78350f",
                        borderRadius: 10,
                        padding: 18,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                        🎯 結尾 CTA{copiedField === "cta" ? " ✓ 已複製" : ""}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 600, color: "#fde68a", lineHeight: 1.6 }}>
                        {scripts[activeScript]?.cta}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {storyboard.length > 0 && (
            <section style={{ marginTop: 48, marginBottom: 60 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ width: 4, height: 24, background: "#a855f7", borderRadius: 2 }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>分鏡表</h2>
                <span
                  style={{
                    background: "#0f0a1f",
                    border: "1px solid #4c1d95",
                    color: "#a78bfa",
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {storyboard.length} 個鏡頭
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 20,
                    top: 10,
                    bottom: 30,
                    width: 2,
                    background: "linear-gradient(to bottom, #a855f7, #2563eb)",
                    opacity: 0.25,
                  }}
                />
                <div style={{ display: "grid", gap: 0 }}>
                  {storyboard.map((scene, index) => {
                    const dotColor = PURPOSE_COLORS[scene?.purpose || ""] || "#555";
                    return (
                      <div key={index} style={{ display: "flex", gap: 16, paddingBottom: 24, paddingLeft: 8 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 24 }}>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: dotColor,
                              border: "2px solid #000",
                              zIndex: 1,
                              marginTop: 4,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            background: "#080808",
                            border: "1px solid #1a1a1a",
                            borderRadius: 12,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 16px",
                              borderBottom: "1px solid #111",
                              background: "#0a0a0a",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                background: "#1a1a1a",
                                color: "#888",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 4,
                              }}
                            >
                              Scene {scene?.scene || index + 1}
                            </span>
                            {scene?.timeRange && <span style={{ color: "#555", fontSize: 12 }}>{scene.timeRange}</span>}
                            {scene?.shotType && (
                              <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>{scene.shotType}</span>
                            )}
                          </div>
                          <div style={{ padding: 16, display: "grid", gap: 12 }}>
                            {scene?.visualContent && (
                              <div>
                                <div style={{ color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🎬 畫面</div>
                                <div style={{ color: "#e5e5e5", fontSize: 14, lineHeight: 1.7 }}>{scene.visualContent}</div>
                              </div>
                            )}
                            {scene?.voiceover && (
                              <div>
                                <div style={{ color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🎙️ 口白</div>
                                <div style={{ color: "#93c5fd", fontSize: 15, lineHeight: 1.7 }}>{scene.voiceover}</div>
                              </div>
                            )}
                            {scene?.caption && (
                              <div>
                                <div style={{ color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>✏️ 字幕</div>
                                <div style={{ color: "#facc15", fontSize: 15, lineHeight: 1.7 }}>{scene.caption}</div>
                              </div>
                            )}
                            {scene?.shootingTip && (
                              <div style={{ background: "#0a0800", border: "1px solid #292100", borderRadius: 8, padding: "10px 14px" }}>
                                <div style={{ color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>💡 拍攝提示</div>
                                <div style={{ color: "#d97706", fontSize: 14, lineHeight: 1.6 }}>{scene.shootingTip}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <GuestAccessModal open={showGuestModal} onClose={() => setShowGuestModal(false)} />
    </>
  );
}

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: 14, textAlign: "center" }}>
      <div style={{ color: "#555", fontSize: 11, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
      <div style={{ color: "#333", fontSize: 11, marginTop: 4 }}>/10</div>
    </div>
  );
}

function StepCard({
  step,
  title,
  children,
  accent = "#111",
  border = "#222",
}: {
  step: number;
  title: string;
  children: ReactNode;
  accent?: string;
  border?: string;
}) {
  return (
    <div style={{ background: accent, border: `1px solid ${border}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div
          style={{
            background: "#ef4444",
            color: "#fff",
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {step}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function TabBtn({
  active = false,
  disabled = false,
  badge,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "8px 18px",
        borderRadius: 8,
        border: active ? "1px solid #ef4444" : disabled ? "1px solid #222" : "1px solid #333",
        background: active ? "#2a0a0a" : disabled ? "#050505" : "#0a0a0a",
        color: active ? "#f87171" : disabled ? "#555" : "#666",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        opacity: disabled ? 0.55 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        userSelect: "none",
      }}
    >
      <span>{children}</span>
      {badge && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#999",
            background: "#111",
            border: "1px solid #222",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function FieldBlock({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{label}</div>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 8, lineHeight: 1.6 }}>{hint}</div>
      {children}
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {title}
        {badge && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: "#4ade80",
              background: "#0a1f0a",
              border: "1px solid #166534",
              padding: "3px 10px",
              borderRadius: 6,
            }}
          >
            → {badge}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function AnalCard({
  label,
  value,
  list,
  highlight = false,
}: {
  label: string;
  value?: string;
  list?: string[];
  highlight?: boolean;
}) {
  const content = list ? list.join("\n• ") : value;
  const displayContent = list ? `• ${content}` : content;
  if (!displayContent) return null;

  return (
    <div
      style={{
        background: highlight ? "#050f05" : "#0a0a0a",
        border: `1px solid ${highlight ? "#166534" : "#1a1a1a"}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: highlight ? "#4ade80" : "#ccc" }}>
        {displayContent}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #2a2a2a",
  background: "#0a0a0a",
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};

const cardStyle: CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  padding: 20,
};