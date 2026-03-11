"use client";

import { useEffect, useState } from "react";

type TitlesResult = {
  education?: string[];
  controversial?: string[];
  fear?: string[];
  story?: string[];
  simple?: string[];
};

export default function TitlesPage() {
  const [titles, setTitles] = useState<TitlesResult | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("lastTitles");
    if (raw) {
      try {
        setTitles(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const groups = [
    { key: "education", label: "教育型" },
    { key: "controversial", label: "爭議型" },
    { key: "fear", label: "恐懼型" },
    { key: "story", label: "故事型" },
    { key: "simple", label: "白話型" },
  ] as const;

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-6">標題結果</h1>

        {!titles ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
            目前沒有標題資料，請先去分析頁生成標題。
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {groups.map((group) => {
              const items = titles[group.key] || [];
              return (
                <div
                  key={group.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <h2 className="text-2xl font-bold mb-4">{group.label}</h2>
                  <ul className="space-y-3">
                    {items.map((item, index) => (
                      <li
                        key={index}
                        className="rounded-xl bg-white/5 px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}