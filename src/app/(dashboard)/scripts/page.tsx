"use client";

import { useEffect, useState } from "react";

type ScriptItem = {
  versionType: string;
  hook: string;
  shortScript: string;
  caption: string;
  cta: string;
  shootingSuggestion: string;
};

const BOOKMARKS_KEY = "hookvox_bookmarked_scripts";

function getBookmarks(): ScriptItem[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(items: ScriptItem[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
}

function isBookmarked(bookmarks: ScriptItem[], item: ScriptItem) {
  return bookmarks.some(
    (b) => b.hook === item.hook && b.shortScript === item.shortScript
  );
}

function formatScriptText(item: ScriptItem) {
  return [
    `【${item.versionType}】`,
    "",
    `Hook：${item.hook}`,
    "",
    `腳本：`,
    item.shortScript,
    "",
    `Caption：${item.caption}`,
    "",
    `CTA：${item.cta}`,
    "",
    `拍攝建議：${item.shootingSuggestion}`,
  ].join("\n");
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [bookmarks, setBookmarks] = useState<ScriptItem[]>([]);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("lastScripts");
    if (raw) {
      try {
        setScripts(JSON.parse(raw));
      } catch {}
    }
    setBookmarks(getBookmarks());
  }, []);

  const toggleBookmark = (item: ScriptItem) => {
    setBookmarks((prev) => {
      const exists = isBookmarked(prev, item);
      const next = exists
        ? prev.filter((b) => !(b.hook === item.hook && b.shortScript === item.shortScript))
        : [...prev, item];
      saveBookmarks(next);
      return next;
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleExportAll = () => {
    const items = showBookmarksOnly ? bookmarks : scripts;
    if (items.length === 0) return;
    const content = items.map(formatScriptText).join("\n\n" + "─".repeat(40) + "\n\n");
    const label = showBookmarksOnly ? "收藏腳本" : "全部腳本";
    downloadText(`Hookvox_${label}_${new Date().toLocaleDateString("zh-TW")}.txt`, content);
  };

  const displayScripts = showBookmarksOnly ? bookmarks : scripts;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black mb-1">腳本結果</h1>
          <p className="text-white/40 text-sm">
            {showBookmarksOnly
              ? `已收藏 ${bookmarks.length} 個腳本`
              : `共 ${scripts.length} 個腳本`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowBookmarksOnly((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              showBookmarksOnly
                ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                : "bg-white/5 border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {showBookmarksOnly ? "★ 顯示收藏" : "☆ 顯示收藏"}
          </button>
          {displayScripts.length > 0 && (
            <button
              type="button"
              onClick={handleExportAll}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
            >
              下載文字檔
            </button>
          )}
        </div>
      </div>

      {displayScripts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="text-4xl mb-3">{showBookmarksOnly ? "☆" : "📝"}</div>
          <p className="text-white/50">
            {showBookmarksOnly
              ? "還沒有收藏的腳本，點腳本右上角的 ☆ 來收藏"
              : "目前沒有腳本資料，請先去分析頁生成腳本。"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {displayScripts.map((item, index) => {
            const saved = isBookmarked(bookmarks, item);
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 relative group"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold">{item.versionType}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(formatScriptText(item), `all-${index}`)}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg border border-white/10 hover:border-white/20"
                    >
                      {copiedField === `all-${index}` ? "已複製" : "複製全部"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(item)}
                      className={`text-lg transition-colors ${
                        saved ? "text-amber-400" : "text-white/30 hover:text-amber-400"
                      }`}
                      title={saved ? "取消收藏" : "收藏"}
                    >
                      {saved ? "★" : "☆"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Hook", value: item.hook, key: "hook" },
                    { label: "腳本", value: item.shortScript, key: "script" },
                    { label: "Caption", value: item.caption, key: "caption" },
                    { label: "CTA", value: item.cta, key: "cta" },
                    { label: "拍攝建議", value: item.shootingSuggestion, key: "shoot" },
                  ].map((field) => (
                    <div key={field.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm text-white/50">{field.label}</div>
                        <button
                          type="button"
                          onClick={() => handleCopy(field.value, `${field.key}-${index}`)}
                          className="text-xs text-white/30 hover:text-white/60 transition-colors"
                        >
                          {copiedField === `${field.key}-${index}` ? "已複製" : "複製"}
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap text-white/80">{field.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
