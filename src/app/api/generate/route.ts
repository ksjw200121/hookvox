import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { toFile } from "openai/uploads";
import { cleanupDownloadedVideo, downloadPublicVideo } from "@/lib/video-downloader";
import { getUserIdFromRequest, checkUsageLimit, logUsage } from "@/lib/usage-checker";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `你是一個研究過台灣 500+ 個爆款短影音的內容策略師。
你的工作是把逐字稿拆解到「每一句話為什麼有效」，幫助創作者複製爆款邏輯。

對逐字稿做以下六步驟分析：

步驟一：開場句解構
第一句話說了什麼？
這句話同時做到了幾件事：讓人知道議題、讓目標受眾覺得「這在說我」？
屬於哪種開場模式？對話演戲 / 自言自語 / 數字衝擊 / 反常識 / 身份認同

步驟二：議題與受眾還原
這支影片在講什麼議題？
目標受眾是誰？他在什麼生活場景下滑到這支影片？
受眾看到第一句話，心裡在想什麼？（用第一人稱「我⋯⋯」還原，要有具體生活場景，100字以上）

步驟三：情緒弧線
從什麼情緒開始？（焦慮 / 好奇 / 不舒服 / 憤怒 / 認同）
轉折點在哪裡？怎麼推進？
結尾讓觀眾帶走什麼感覺？

步驟四：結構對應
逐段對應：Hook → 痛點放大 → 轉折 → 解決方向 → CTA
標出每段的原文位置

步驟五：可複製公式提煉
把成功邏輯提煉成：
[情緒觸發] + [具體場景或數字] + [轉折手法] + [CTA類型]

步驟六：法規安全檢查 + 內容分類

contentCategory 分類規則（只能選一個）：
- EDUCATIONAL：提供資訊、知識、技能（保險/房仲/美業/健身/食譜/旅遊/探店/化妝教學）
- COMEDY：搞笑、整蠱、Meme、無厘頭
- DAILY_LIFE：純粹記錄日常生活，沒有實用資訊
- WORK_DIARY：工作日常vlog，沒有提供知識或技能

輸出純 JSON，格式如下，不要有其他文字：

{
  "contentCategory": "EDUCATIONAL",
  "coreTopic": "這支影片在講什麼（一句話）",
  "targetAudience": "目標受眾描述（年齡、身份、正在煩惱什麼）",
  "summary": "2-3句話說明這篇的核心成功邏輯",
  "hook": "第一句話原文",
  "hookModel": "對話演戲 / 自言自語 / 數字衝擊 / 反常識 / 身份認同",
  "openingDoubleDuty": "這句話如何同時點題又讓受眾覺得跟自己有關",
  "emotion": "主要情緒",
  "emotionArc": {
    "start": "起始情緒",
    "turning": "轉折點",
    "end": "結尾情緒"
  },
  "viralReasons": ["爆紅原因1", "爆紅原因2", "爆紅原因3"],
  "painPoints": ["痛點1（有場景感）", "痛點2", "痛點3"],
  "ctaType": "CTA類型說明",
  "combinedFormula": "[情緒觸發] + [場景/數字] + [轉折手法] + [CTA類型]",
  "keyInsights": ["關鍵洞察1", "關鍵洞察2", "關鍵洞察3"],
  "legalIssues": []
}`

function extractTextFromClaude(content: Anthropic.Messages.Message["content"]): string {
  return content
    .filter((block) => block.type === "text")
    .map((block) => (block as Anthropic.Messages.TextBlock).text)
    .join("\n");
}

function safeParseJson(raw: string) {
  try { return JSON.parse(raw.trim()); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req: Request) {
  let tempDir = "";
  try {
    // ── 1. 驗證登入 ──
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    // ── 2. 檢查使用次數 ──
    const usage = await checkUsageLimit(userId);
    if (!usage.allowed) {
      return NextResponse.json({
        error: `免費版每月限制 ${usage.limit} 次，本月已使用 ${usage.used} 次。升級 Pro 即可無限使用！`,
        limitReached: true,
        used: usage.used,
        limit: usage.limit,
      }, { status: 403 });
    }

    // ── 3. 基本驗證 ──
    const body = await req.json();
    const url = String(body?.url || "").trim();

    if (!url) return NextResponse.json({ error: "缺少網址" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY 尚未設定" }, { status: 500 });
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY 尚未設定" }, { status: 500 });

    // ── 4. 分析邏輯 ──
    const downloaded = await downloadPublicVideo(url);
    tempDir = downloaded.tempDir;

    const uploadedFile = await toFile(downloaded.buffer, downloaded.fileName, { type: "video/mp4" });
    const transcription = await openai.audio.transcriptions.create({ file: uploadedFile, model: "whisper-1" });
    const transcript = transcription.text?.trim();

    if (!transcript) return NextResponse.json({ error: "Whisper 沒有成功轉出逐字稿" }, { status: 500 });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: [{ type: "text", text: ANALYSIS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `以下是影片逐字稿，請分析：\n\n${transcript}` }],
    });

    const text = extractTextFromClaude(response.content);
    let analysis: Record<string, unknown>;
    try {
      analysis = safeParseJson(text);
    } catch {
      return NextResponse.json({ error: "Claude 分析回傳不是合法 JSON", raw: text }, { status: 500 });
    }

    // ── 5. 分析成功才記錄次數 ──
    await logUsage(publicUserId, "ANALYZE");

    return NextResponse.json({
      success: true,
      transcript,
      analysis,
      usage: { used: usage.used + 1, limit: usage.limit, isPro: usage.isPro },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("analyze error:", err);
    return NextResponse.json({ error: err?.message || "分析失敗" }, { status: 500 });
  } finally {
    if (tempDir) await cleanupDownloadedVideo(tempDir);
  }
}