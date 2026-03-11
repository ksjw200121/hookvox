"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FIELD_GUIDE, INDUSTRIES_WITH_STORYBOARD, Industry } from "@/prompts";

type AnalysisData = {
  contentCategory?: string;
  summary?: string;
  targetAudience?: string;
  coreTopic?: string;
  hook?: string;
  hookModel?: string;
  emotion?: string;
  viralReasons?: string[];
  painPoints?: string[];
  ctaType?: string;
  combinedFormula?: string;
  keyInsights?: string[];
};

type ScriptItem = { version?: string; hook?: string; script?: string; cta?: string; };
type StoryboardScene = { scene: number; timeRange: string; shotType: string; visualContent: string; voiceover: string; caption: string; shootingTip: string; };

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

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`API 沒有回傳 JSON：${text.slice(0, 200)}`); }
}

// 取得 Bearer token
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { "Authorization": `Bearer ${session.access_token}` };
}

export default function AnalyzePage() {
  const [inputMode, setInputMode] = useState<"url" | "script">("url");
  const [url, setUrl] = useState("");
  const [customScript, setCustomScript] = useState("");
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

  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);

  const guide = FIELD_GUIDE[industry];
  const isStoryboardIndustry = INDUSTRIES_WITH_STORYBOARD.includes(industry);

  const analyzeVideo = async () => {
    try {
      setError(""); setBlocked(false); setUsageLimitReached(false); setLoadingAnalyze(true);
      setTranscript(""); setAnalysis(null); setScripts([]); setTitles([]); setStoryboard([]);

      const authHeader = await getAuthHeader();
      const body = inputMode === "script" ? { customScript } : { url };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);

      if (res.status === 401) { setError("請先登入再使用分析功能"); return; }
      if (res.status === 403 && data?.upgradeRequired) { setUsageLimitReached(true); return; }
      if (!res.ok) throw new Error(data?.error || "分析失敗");

      setTranscript(inputMode === "script" ? customScript : (data?.transcript || ""));
      const a = data?.analysis || null;
      setAnalysis(a);
      if (a?.contentCategory && BLOCKED_CATEGORIES.includes(a.contentCategory)) setBlocked(true);
    } catch (err: any) { setError(err?.message || "分析失敗"); }
    finally { setLoadingAnalyze(false); }
  };

  const generateContent = async () => {
    if (blocked) return;
    try {
      setError(""); setUsageLimitReached(false); setLoadingGenerate(true);
      setScripts([]); setTitles([]); setStoryboard([]);

      const authHeader = await getAuthHeader();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          industry,
          topic: topic || analysis?.coreTopic || "",
          targetAudience: targetAudience || analysis?.targetAudience || "",
          ctaGoal, analysis, substitution,
          wantStoryboard: wantStoryboard || isStoryboardIndustry,
        }),
      });
      const data = await readJsonSafe(res);

      if (res.status === 401) { setError("請先登入再使用生成功能"); return; }
      if (res.status === 403 && data?.upgradeRequired) { setUsageLimitReached(true); return; }
      if (!res.ok) throw new Error(data?.error || "生成失敗");

      setScripts(data?.scripts?.scripts || []);
      setTitles(data?.titles?.titles || []);
      setStoryboard(data?.storyboard?.storyboard || []);
    } catch (err: any) { setError(err?.message || "生成失敗"); }
    finally { setLoadingGenerate(false); }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Hookvox</h1>
        <p style={{ color: "#555", marginBottom: 32, fontSize: 14 }}>分析爆款影片的公式，套用到你自己的內容</p>

        {/* STEP 1 輸入 */}
        <StepCard step={1} title="選擇分析來源">
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <TabBtn active={inputMode === "url"} onClick={() => setInputMode("url")}>貼爆款影片網址</TabBtn>
            <TabBtn active={inputMode === "script"} onClick={() => setInputMode("script")}>貼我自己的腳本</TabBtn>
          </div>

          {inputMode === "url" ? (
            <FieldBlock label="影片網址" hint="貼上 IG Reels、TikTok 或 YouTube Shorts 的連結。系統會自動下載、轉成逐字稿再分析爆款公式。">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." style={inputStyle} />
            </FieldBlock>
          ) : (
            <FieldBlock label="貼上你的腳本" hint="把已經寫好的腳本貼上來，直接分析並生成標題和分鏡。比上傳影片更快、成本也更低（省下影片下載和語音辨識費用）。">
              <textarea value={customScript} onChange={(e) => setCustomScript(e.target.value)} placeholder={"把腳本貼在這裡...\n每句一行，例如：\n你知道炸雞可以不用油鍋嗎\n我試了三次終於找到最酥脆的方法\n..."} rows={8} style={{ ...inputStyle, resize: "vertical" }} />
            </FieldBlock>
          )}
        </StepCard>

        {/* STEP 2 內容設定 */}
        <StepCard step={2} title="填寫你的內容設定">
          <p style={{ color: "#555", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            這些設定讓 AI 知道要幫你寫什麼內容。<strong style={{ color: "#aaa" }}>主題和受眾可以留空</strong>，系統會從分析結果自動帶入。
          </p>

          <FieldBlock label="產業" hint={`選擇最接近你的行業。${isStoryboardIndustry ? "✅ 這個行業會自動生成分鏡表。" : "這個行業不預設生成分鏡，可在下方手動勾選。"}`}>
            <select value={industry} onChange={(e) => { setIndustry(e.target.value as Industry); setWantStoryboard(false); }} style={inputStyle}>
              {(Object.entries(INDUSTRY_LABELS) as [Industry, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}{INDUSTRIES_WITH_STORYBOARD.includes(val) ? " 📋" : ""}</option>
              ))}
            </select>
          </FieldBlock>

          <FieldBlock label="主題（選填）" hint={guide.topic}>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={guide.topicPlaceholder} style={inputStyle} />
          </FieldBlock>

          <FieldBlock label="目標受眾（選填）" hint={guide.audience}>
            <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder={guide.audiencePlaceholder} style={inputStyle} />
          </FieldBlock>

          <FieldBlock label="CTA 目標" hint={guide.cta}>
            <input value={ctaGoal} onChange={(e) => setCtaGoal(e.target.value)} placeholder={guide.ctaPlaceholder} style={inputStyle} />
          </FieldBlock>

          {!isStoryboardIndustry && (
            <div style={{ marginTop: 8, padding: "12px 16px", background: "#111", border: "1px solid #222", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setWantStoryboard(!wantStoryboard)}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${wantStoryboard ? "#60a5fa" : "#444"}`, background: wantStoryboard ? "#1e3a5f" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {wantStoryboard && <span style={{ color: "#60a5fa", fontSize: 14 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>📋 我也要分鏡表</div>
                <div style={{ color: "#555", fontSize: 12, marginTop: 2 }}>根據版本A的腳本自動生成拍攝分鏡（會多花約10秒）</div>
              </div>
            </div>
          )}
        </StepCard>

        {/* STEP 3 替換 */}
        <StepCard step={3} title="套用到我的內容（選填）" accent="#0a160a" border="#166534">
          <p style={{ color: "#86efac", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            分析完爆款公式後，AI 會把同樣的公式套用到你自己的主角。
            <strong style={{ color: "#4ade80" }}> 不填就直接複製原影片的邏輯。</strong>
          </p>
          <FieldBlock label="你的主角是什麼？" hint={guide.substitution}>
            <input value={substitution} onChange={(e) => setSubstitution(e.target.value)} placeholder={guide.substitutionPlaceholder} style={{ ...inputStyle, borderColor: "#166534", background: "#050f05" }} />
          </FieldBlock>
        </StepCard>

        {/* 按鈕 */}
        <div style={{ display: "flex", gap: 12, marginTop: 4, marginBottom: 24 }}>
          <button onClick={analyzeVideo} disabled={loadingAnalyze || (inputMode === "url" ? !url : !customScript)}
            style={{ background: "#ef4444", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 10, cursor: "pointer", fontSize: 16, fontWeight: 600, opacity: loadingAnalyze || (inputMode === "url" ? !url : !customScript) ? 0.5 : 1 }}>
            {loadingAnalyze ? "⏳ 分析中..." : inputMode === "url" ? "🔍 分析影片" : "🔍 分析腳本"}
          </button>
          <button onClick={generateContent} disabled={loadingGenerate || !analysis || blocked}
            style={{ background: "#2563eb", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 10, cursor: "pointer", fontSize: 16, fontWeight: 600, opacity: loadingGenerate || !analysis || blocked ? 0.5 : 1 }}>
            {loadingGenerate ? "⏳ 生成中..." : substitution ? `✨ 套用到「${substitution}」` : "✨ 生成腳本和標題"}
          </button>
        </div>

        {/* 次數用完提示 */}
        {usageLimitReached && (
          <div style={{ padding: 20, borderRadius: 12, background: "#1a0a00", color: "#fb923c", border: "1px solid #9a3412", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>⚠️ 本月免費次數已用完</div>
              <div style={{ fontSize: 14, color: "#fdba74" }}>升級方案即可繼續使用，每月可用次數大幅增加。</div>
            </div>
            <Link href="/plans" style={{ background: "#ea580c", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
              立即升級 →
            </Link>
          </div>
        )}

        {blocked && <div style={{ padding: 20, borderRadius: 12, background: "#1a1a00", color: "#fbbf24", border: "1px solid #854d0e", whiteSpace: "pre-wrap", lineHeight: 1.8, marginBottom: 24 }}>{BLOCK_MESSAGE}</div>}
        {error && <div style={{ padding: 14, borderRadius: 10, background: "#3b0a0a", color: "#fca5a5", border: "1px solid #7f1d1d", marginBottom: 24 }}>{error}</div>}

        {/* 逐字稿 */}
        {transcript && <Section title="逐字稿"><div style={cardStyle}>{transcript}</div></Section>}

        {/* 爆款分析 */}
        {analysis && !blocked && (
          <Section title="爆款分析">
            <div style={{ display: "grid", gap: 10 }}>
              <AnalCard label="核心主題" value={analysis.coreTopic} />
              <AnalCard label="目標受眾" value={analysis.targetAudience} />
              <AnalCard label="摘要" value={analysis.summary} />
              <AnalCard label="Hook" value={analysis.hook} />
              <AnalCard label="Hook 類型" value={analysis.hookModel} />
              <AnalCard label="情緒" value={analysis.emotion} />
              <AnalCard label="CTA 類型" value={analysis.ctaType} />
              <AnalCard label="爆款原因" list={analysis.viralReasons} />
              <AnalCard label="痛點" list={analysis.painPoints} />
              <AnalCard label="爆款公式" value={analysis.combinedFormula} highlight />
              <AnalCard label="關鍵洞察" list={analysis.keyInsights} />
            </div>
          </Section>
        )}

        {/* 腳本 */}
        {scripts.length > 0 && (
          <Section title="腳本" badge={substitution ? `套用到：${substitution}` : undefined}>
            <div style={{ display: "grid", gap: 16 }}>
              {scripts.map((s, i) => (
                <div key={i} style={cardStyle}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: "#ef4444" }}>版本 {s.version || i + 1}</div>
                  <FRow label="Hook（開場鉤子）" value={s.hook} />
                  <FRow label="腳本" value={s.script} pre />
                  <FRow label="CTA（結尾行動）" value={s.cta} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 分鏡 */}
        {storyboard.length > 0 && (
          <Section title="分鏡表" badge={substitution ? substitution : undefined}>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 14 }}>根據版本A的腳本自動生成，拍攝時按順序來即可。</p>
            <div style={{ display: "grid", gap: 12 }}>
              {storyboard.map((sc, i) => (
                <div key={i} style={{ ...cardStyle, display: "grid", gridTemplateColumns: "88px 1fr", gap: 16, alignItems: "start" }}>
                  <div style={{ textAlign: "center", paddingTop: 4 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>#{sc.scene}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{sc.timeRange}</div>
                    <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 6, background: "#0f1f3f", padding: "3px 8px", borderRadius: 6 }}>{sc.shotType}</div>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <FRow label="畫面" value={sc.visualContent} />
                    {sc.voiceover && <FRow label="台詞" value={`「${sc.voiceover}」`} color="#a3e635" />}
                    {sc.caption && <FRow label="字幕" value={sc.caption} badge />}
                    <FRow label="拍攝提示" value={`💡 ${sc.shootingTip}`} color="#fbbf24" />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 標題 */}
        {titles.length > 0 && (
          <Section title="標題" badge={substitution ? substitution : undefined}>
            <div style={cardStyle}>
              <ul style={{ padding: 0, margin: 0 }}>
                {titles.map((t, i) => (
                  <li key={i} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < titles.length - 1 ? "1px solid #1a1a1a" : "none", listStyle: "none" }}>
                    <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 12, minWidth: 28, paddingTop: 3 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ lineHeight: 1.8 }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}

// ─── 元件 ────────────────────────────────────────

function StepCard({ step, title, children, accent = "#111", border = "#222" }: { step: number; title: string; children: React.ReactNode; accent?: string; border?: string }) {
  return (
    <div style={{ background: accent, border: `1px solid ${border}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#ef4444", color: "#fff", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{step}</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: "8px 18px", borderRadius: 8, border: active ? "1px solid #ef4444" : "1px solid #333", background: active ? "#2a0a0a" : "#0a0a0a", color: active ? "#f87171" : "#666", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400 }}>
      {children}
    </button>
  );
}

function FieldBlock({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{label}</div>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 8, lineHeight: 1.6 }}>{hint}</div>
      {children}
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {title}
        {badge && <span style={{ fontSize: 14, fontWeight: 400, color: "#4ade80", background: "#0a1f0a", border: "1px solid #166534", padding: "3px 10px", borderRadius: 6 }}>→ {badge}</span>}
      </h2>
      {children}
    </section>
  );
}

function AnalCard({ label, value, list, highlight = false }: { label: string; value?: string; list?: string[]; highlight?: boolean }) {
  const content = list ? list.join("\n• ") : value;
  const displayContent = list ? `• ${content}` : content;
  if (!displayContent) return null;
  return (
    <div style={{ background: highlight ? "#050f05" : "#0a0a0a", border: `1px solid ${highlight ? "#166534" : "#1a1a1a"}`, borderRadius: 10, padding: 14 }}>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: highlight ? "#4ade80" : "#ccc" }}>{displayContent}</div>
    </div>
  );
}

function FRow({ label, value, pre = false, color, badge = false }: { label: string; value?: string; pre?: boolean; color?: string; badge?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>{label}</div>
      {badge
        ? <span style={{ background: "#1a1a1a", padding: "3px 10px", borderRadius: 6, fontSize: 14 }}>{value}</span>
        : <div style={{ whiteSpace: pre ? "pre-wrap" : "normal", lineHeight: 1.8, color: color || "#e5e5e5" }}>{value}</div>
      }
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #2a2a2a", background: "#0a0a0a", color: "#fff", fontSize: 14, boxSizing: "border-box" };
const cardStyle: React.CSSProperties = { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12, padding: 20 };
