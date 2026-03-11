"use client";

import { useEffect, useState } from "react";

type IdeaItem = {
  title: string;
  hookStyle: string;
  emotion: string;
  shootingSuggestion: string;
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("lastIdeas");
    if (raw) {
      try {
        setIdeas(JSON.parse(raw));
      } catch {}
    }
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-6">內容方向結果</h1>

        {ideas.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
            目前沒有內容方向資料，請先去分析頁生成內容方向。
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {ideas.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h2 className="text-2xl font-bold mb-4">{item.title}</h2>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-white/50 mb-1">Hook 風格</div>
                    <div>{item.hookStyle}</div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 mb-1">情緒</div>
                    <div>{item.emotion}</div>
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