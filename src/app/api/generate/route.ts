import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserIdFromRequest, checkUsageLimit, logUsage } from "@/lib/usage-checker";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const { analysis, transcript, userTopic } = body;

    if (!analysis) return NextResponse.json({ error: "缺少分析資料" }, { status: 400 });

    const prompt = `你是爆款腳本生成專家。根據以下分析結果，為用戶生成腳本和標題。

分析結果：
${JSON.stringify(analysis, null, 2)}

${transcript ? `原始逐字稿：\n${transcript}\n` : ""}
${userTopic ? `用戶主題：${userTopic}` : ""}

請生成：
1. 3個爆款標題（吸引點擊）
2. 一份完整腳本（包含開場、主體、結尾CTA）

回傳純 JSON：
{
  "titles": ["標題1", "標題2", "標題3"],
  "script": {
    "hook": "開場鉤子（前3秒）",
    "body": "主體內容（分段）",
    "cta": "結尾行動呼籲"
  }
}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = extractTextFromClaude(response.content);
    let result: Record<string, unknown>;
    try {
      result = safeParseJson(text);
    } catch {
      return NextResponse.json({ error: "Claude 回傳格式不是 JSON", raw: text }, { status: 500 });
    }

    await logUsage(publicUserId, "GENERATE_SCRIPT");

    return NextResponse.json({
      success: true,
      ...result,
      usage: { used: null, limit: 3, isPro: (usage as any).isPro },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("generate error:", err);
    return NextResponse.json({ error: err?.message || "伺服器錯誤" }, { status: 500 });
  }
}