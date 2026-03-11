import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { toFile } from "openai/uploads";
import { cleanupDownloadedVideo, downloadPublicVideo } from "@/lib/video-downloader";
import { getUserIdFromRequest, checkUsageLimit, logUsage } from "@/lib/usage-checker";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `你是一位專業的爆款短影音分析師，擁有 500+ 萬粉絲操盤經驗。
請分析這段影片的逐字稿，找出讓它爆款的關鍵公式。

請回傳純 JSON，格式如下：

{
  "contentCategory": "EDUCATIONAL",
  "coreTopic": "核心主題",
  "targetAudience": "目標受眾",
  "summary": "2-3句摘要",
  "hook": "開頭鉤子內容",
  "hookModel": "懸念式 / 反常識 / 痛點共鳴 / 身份認同 / 挑戰權威",
  "openingDoubleDuty": "開頭如何同時完成留人+設定期待",
  "emotion": "核心情緒",
  "emotionArc": {
    "start": "開頭情緒",
    "turning": "轉折點",
    "end": "結尾情緒"
  },
  "viralReasons": ["原因1", "原因2", "原因3"],
  "painPoints": ["痛點1", "痛點2", "痛點3"],
  "ctaType": "CTA類型",
  "combinedFormula": "[開頭鉤子] + [衝突/痛點] + [解決方案] + [CTA]",
  "keyInsights": ["洞察1", "洞察2", "洞察3"],
  "legalIssues": []
}`;

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
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const usage = await checkUsageLimit(userId);
    if (!usage.allowed) {
      return NextResponse.json({
        error: `本月免費次數已達上限 ${usage.limit} 次，已使用 ${usage.used} 次，請升級 Pro 繼續使用`,
        limitReached: true,
        upgradeRequired: true,
        used: usage.used,
        limit: usage.limit,
      }, { status: 403 });
    }
    const publicUserId = (usage as any).publicUserId ?? userId;

    const body = await req.json();
    const url = String(body?.url || "").trim();

    if (!url) return NextResponse.json({ error: "請提供影片網址" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY 未設定" }, { status: 500 });
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY 未設定" }, { status: 500 });

    const downloaded = await downloadPublicVideo(url);
    tempDir = downloaded.tempDir;

    const uploadedFile = await toFile(downloaded.buffer, downloaded.fileName, { type: "video/mp4" });
    const transcription = await openai.audio.transcriptions.create({ file: uploadedFile, model: "whisper-1" });
    const transcript = transcription.text?.trim();

    if (!transcript) return NextResponse.json({ error: "Whisper 無法辨識語音" }, { status: 500 });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: [{ type: "text", text: ANALYSIS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `請分析以下影片逐字稿：\n\n${transcript}` }],
    });

    const text = extractTextFromClaude(response.content);
    let analysis: Record<string, unknown>;
    try {
      analysis = safeParseJson(text);
    } catch {
      return NextResponse.json({ error: "Claude 回傳格式不是 JSON", raw: text }, { status: 500 });
    }

    await logUsage(publicUserId, "ANALYZE");

    return NextResponse.json({
      success: true,
      transcript,
      analysis,
      usage: { used: null, limit: 3, isPro: (usage as any).isPro },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("analyze error:", err);
    return NextResponse.json({ error: err?.message || "伺服器錯誤" }, { status: 500 });
  } finally {
    if (tempDir) await cleanupDownloadedVideo(tempDir);
  }
}