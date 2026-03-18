import { isAiEnabled } from "@/lib/ai-switch";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  logUsage,
} from "@/lib/usage-checker";
import {
  assertCostGuard,
  assertRateLimit,
  recordEstimatedCost,
} from "@/lib/security-guard";
import { getScriptGenerationPrompt } from "@/prompts";
import type { Industry } from "@/prompts";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
      routeKey: "generate",
      limit: Number(process.env.RATE_LIMIT_GENERATE_PER_MIN ?? 8),
      windowMinutes: 1,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "操作太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    const costGuard = await assertCostGuard("GENERATE_SCRIPT");
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "系統今日 AI 成本保護已啟動，請稍後再試" },
        { status: 503 }
      );
    }

    const usage = await checkUsageLimit(userId, "GENERATE");
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `本月生成次數已達上限 ${usage.limit} 次，請升級方案`,
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

    const body = await req.json();
    const analysis = body?.analysis;
    const industry = String(body?.industry || "GENERAL") as Industry;
    const topic = String(body?.topic || "").trim();
    const targetAudience = String(body?.targetAudience || "").trim();
    const ctaGoal = String(body?.ctaGoal || "").trim();
    const substitution = String(body?.substitution || "").trim() || undefined;
    const transcript = String(body?.transcript || "").trim();

    if (!analysis) {
      return NextResponse.json({ error: "缺少分析結果" }, { status: 400 });
    }

    if (!topic) {
      return NextResponse.json({ error: "請填寫主題" }, { status: 400 });
    }

    const prompt = getScriptGenerationPrompt({
      industry,
      topic,
      targetAudience,
      ctaGoal,
      viralAnalysis: analysis,
      substitution,
    });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw =
      response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.Messages.TextBlock).text)
        .join("\n") || "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = safeParseJson(raw);
    } catch {
      return NextResponse.json(
        { error: "腳本生成格式錯誤，請重試", raw },
        { status: 500 }
      );
    }

    await logUsage(publicUserId, "GENERATE_SCRIPT");
    await recordEstimatedCost("GENERATE_SCRIPT");

    return NextResponse.json({
      success: true,
      transcript,
      scripts: parsed.scripts || [],
      usage: {
        used: usage.used + 1,
        limit: usage.limit,
        remaining: Math.max(usage.limit - (usage.used + 1), 0),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("scripts error:", err);
    return NextResponse.json(
      { error: err?.message || "腳本生成失敗" },
      { status: 500 }
    );
  }
}
