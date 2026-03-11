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

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("lastScripts");
    if (raw) {
      try {
        setScripts(JSON.parse(raw));
      } catch {}
    }
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-6">腳本結果</h1>

        {scripts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
            目前沒有腳本資料，請先去分析頁生成腳本。
          </div>
        ) : (
          <div className="grid gap-6">
            {scripts.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h2 className="text-2xl font-bold mb-4">{item.versionType}</h2>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-white/50 mb-1">Hook</div>
                    <div>{item.hook}</div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 mb-1">腳本</div>
                    <div className="whitespace-pre-wrap">{item.shortScript}</div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 mb-1">Caption</div>
                    <div className="whitespace-pre-wrap">{item.caption}</div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 mb-1">CTA</div>
                    <div>{item.cta}</div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 mb-1">拍攝建議</div>
                    <div>{item.shootingSuggestion}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}