import { isAiEnabled } from "@/lib/ai-switch";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { toFile } from "openai/uploads";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  logUsage,
} from "@/lib/usage-checker";
import { prisma } from "@/lib/prisma";
import {
  assertCostGuard,
  assertRateLimit,
  getAnalyzeRateLimit,
  recordEstimatedCost,
} from "@/lib/security-guard";
import {
  downloadPublicVideo,
  cleanupDownloadedVideo,
} from "@/lib/video-downloader";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `你是短影音爆款內容分析師，熟悉台灣 IG Reels、TikTok、YouTube Shorts 演算法邏輯。

【重要】只根據「逐字稿內容」分析。逐字稿裡沒有提到的不要臆測，該欄位可填 null 或空陣列。不要瞎掰數據或細節。

【爆款的本質】
- 完播 → 選題對
- 按讚 → 共鳴與共情
- 留言 → 話題感與參與感
- 收藏 → 有用
- 分享 → 你說出我想說的話

【演算法偏好】
- 衝突、認知反差、情緒 > 履歷和專業
- 正確順序：事件/衝突/錯誤 → 才輪到專業
- 情境導向，不是知識導向

【好開頭 vs 壞開頭】
壞：「今天來分享一個知識給大家」
好：「為什麼我媽工作30年，勞退少領30萬？」

【評分 1～10 準則】
- hookScore / viralPotential / replicability：依逐字稿實際表現給分。開頭無力、內容空洞、難以複製就給 4～6；結構明確、可套用就給 7～10。

規則：繁體中文、白話直接、只回傳合法 JSON、不要 markdown、直接從 { 開始

{
  "coreTopic": "核心在講什麼（一句話）",
  "targetAudience": "目標受眾：年齡、狀態、最大焦慮",
  "hookStyle": "鉤子類型（錯誤揭露型/衝突懸念型/數字震撼型/反常識型/恐懼警示型）",
  "hookScore": 8,
  "hookAnalysis": "這個開頭為什麼有效或無效",
  "viralPotential": 8,
  "emotionalTriggers": ["情緒點1", "情緒點2", "情緒點3"],
  "contentStructure": ["開場做了什麼", "中段做了什麼", "結尾做了什麼"],
  "persuasionMechanics": ["說服機制1", "說服機制2", "說服機制3"],
  "viralReasons": ["爆紅原因1（心理學角度）", "爆紅原因2", "爆紅原因3"],
  "keyAngles": ["可借用角度1", "可借用角度2", "可借用角度3"],
  "replicability": 8,
  "ctaStyle": "怎麼引導互動或轉換",
  "keyFormula": "核心爆款公式（一句話，可複製的邏輯）",
  "summary": "白話總結：為什麼有效",
  "painPoints": ["受眾痛點1", "痛點2"],
  "keyInsights": ["關鍵洞察1", "洞察2"],
  "contentCategory": "內容類型（例如：知識教學/故事/搞笑/日常生活/工作日常/理財/職涯 等，若不明可填 GENERAL）"
}`;

function extractTextFromClaude(
  content: Anthropic.Messages.Message["content"]
): string {
  return content
    .filter((block) => block.type === "text")
    .map((block) => (block as Anthropic.Messages.TextBlock).text)
    .join("\n");
}

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw.trim());
  } catch {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function isBlockedPlatform(url: string) {
  const v = url.toLowerCase();
  return (
    v.includes("instagram.com") ||
    v.includes("tiktok.com") ||
    v.includes("vm.tiktok.com")
  );
}

function isYouTubeShortsUrl(url: string) {
  const v = url.toLowerCase();
  return v.includes("youtube.com/shorts/");
}

export async function POST(req: Request) {
  if (!(await isAiEnabled())) {
    return NextResponse.json({ error: "AI 系統暫時關閉" }, { status: 503 });
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const rate = await assertRateLimit({
      req,
      userId,
      routeKey: "analyze",
      limit: getAnalyzeRateLimit(),
      windowMinutes: 1,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "操作太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    const costGuard = await assertCostGuard("ANALYZE");
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "系統今日 AI 成本保護已啟動，請稍後再試", code: costGuard.message },
        { status: 503 }
      );
    }

    const body = await req.json();

    let transcript = String(body?.transcript || "").trim();
    const url = String(body?.url || "").trim();

    if (url) {
      if (isBlockedPlatform(url)) {
        return NextResponse.json(
          {
            error:
              "IG / TikTok 影片請改用「上傳音訊 / 影片」或「貼逐字稿」方式分析",
          },
          { status: 400 }
        );
      }

      if (!isYouTubeShortsUrl(url)) {
        return NextResponse.json(
          {
            error:
              "目前網址分析僅支援 YouTube Shorts，請改貼 youtube.com/shorts/... 連結",
          },
          { status: 400 }
        );
      }
    }

    if (url) {
      const existing = await prisma.viralDatabase.findFirst({
        where: { userId, videoUrl: url },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          cached: true,
          transcript: existing.transcript || "",
          analysis: existing.analysis || {},
          usage: null,
          message: "這支影片你已經分析過，已直接讀取資料庫內容",
        });
      }
    }

    const usage = await checkUsageLimit(userId, "ANALYZE");
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `本月分析次數已達上限 ${usage.limit} 次，已使用 ${usage.used} 次，請升級方案繼續使用`,
          limitReached: true,
          upgradeRequired: true,
          used: usage.used,
          limit: usage.limit,
          remaining: usage.remaining,
        },
        { status: 403 }
      );
    }

    const publicUserId = usage.publicUserId ?? userId;

    if (!transcript) {
      if (url) {
        const download = await downloadPublicVideo(url);

        try {
          const uploadedFile = await toFile(download.buffer, download.fileName, {
            type: "video/mp4",
          });

          const transcription = await openai.audio.transcriptions.create({
            file: uploadedFile,
            model: "whisper-1",
          });

          transcript = transcription.text?.trim() || "";
        } finally {
          await cleanupDownloadedVideo(download.tempDir);
        }

        if (!transcript) {
          return NextResponse.json(
            { error: "無法從影片辨識語音內容" },
            { status: 500 }
          );
        }
      } else if (body?.audioBase64 || body?.videoBase64) {
        const base64 = body.audioBase64 || body.videoBase64;
        const mimeType = body.audioBase64 ? "audio/mpeg" : "video/mp4";
        const fileName = body.audioBase64 ? "audio.mp3" : "video.mp4";
        const buffer = Buffer.from(base64, "base64");

        const uploadedFile = await toFile(buffer, fileName, { type: mimeType });

        const transcription = await openai.audio.transcriptions.create({
          file: uploadedFile,
          model: "whisper-1",
        });

        transcript = transcription.text?.trim() || "";

        if (!transcript) {
          return NextResponse.json(
            { error: "Whisper 無法辨識語音，請確認音訊品質" },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "請提供逐字稿、音訊檔、影片檔或 YouTube Shorts 網址" },
          { status: 400 }
        );
      }
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: ANALYSIS_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `請分析以下影片逐字稿：\n\n${transcript}`,
        },
      ],
    });

    const text = extractTextFromClaude(response.content);

    let analysis: Record<string, unknown>;
    try {
      analysis = safeParseJson(text);
    } catch {
      return NextResponse.json(
        { error: "分析格式錯誤，請重試", raw: text },
        { status: 500 }
      );
    }

    await prisma.viralDatabase.create({
      data: {
        userId: publicUserId,
        videoUrl: url || `manual-${Date.now()}`,
        transcript,
        analysis,
      },
    });

    await logUsage(publicUserId, "ANALYZE");
    await recordEstimatedCost("ANALYZE");

    return NextResponse.json({
      success: true,
      cached: false,
      transcript,
      analysis,
      usage: {
        used: usage.used + 1,
        limit: usage.limit,
        remaining: Math.max(usage.limit - (usage.used + 1), 0),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("analyze error:", err);
    return NextResponse.json(
      { error: err?.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}