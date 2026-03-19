import { isAiEnabled } from "@/lib/ai-switch";
import { sanitizeApiError } from "@/lib/api-error";
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
import { getStoryboardPrompt } from "@/prompts";
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
      if (usage.message === "ACCOUNT_SUSPENDED") {
        return NextResponse.json(
          {
            error: "此帳號目前已被暫停使用，請聯繫我們處理",
            accountSuspended: true,
          },
          { status: 403 }
        );
      }

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
    const industry = String(body?.industry || "GENERAL") as Industry;
    const topic = String(body?.topic || "").trim();
    const script = String(body?.script || "").trim();
    const substitution = String(body?.substitution || "").trim() || undefined;

    if (!topic) {
      return NextResponse.json({ error: "請填寫主題" }, { status: 400 });
    }

    if (!script) {
      return NextResponse.json({ error: "請先生成腳本再建立分鏡" }, { status: 400 });
    }

    const prompt = getStoryboardPrompt({ industry, topic, script, substitution });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
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
        { error: "分鏡生成格式錯誤，請重試", raw },
        { status: 500 }
      );
    }

    await logUsage(publicUserId, "GENERATE_SCRIPT");
    await recordEstimatedCost("GENERATE_SCRIPT");

    return NextResponse.json({
      success: true,
      storyboard: parsed.storyboard || [],
      usage: {
        used: usage.used + 1,
        limit: usage.limit,
        remaining: Math.max(usage.limit - (usage.used + 1), 0),
      },
    });
  } catch (error: unknown) {
    console.error("storyboard error:", error);
    const sanitized = sanitizeApiError(error, "分鏡生成失敗，請稍後再試");
    return NextResponse.json(
      { error: sanitized.message },
      { status: sanitized.status }
    );
  }
}
