import { isAiEnabled } from "@/lib/ai-switch";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  checkUsageLimit,
  getUserIdFromRequest,
  getUserPlan,
  logUsage,
  type PlanName,
} from "@/lib/usage-checker";
import {
  assertCostGuard,
  assertRateLimit,
  getGenerateRateLimit,
  recordEstimatedCost,
} from "@/lib/security-guard";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

function extractTextFromClaude(
  content: Anthropic.Messages.Message["content"]
): string {
  return content
    .filter((block) => block.type === "text")
    .map((block) => (block as Anthropic.Messages.TextBlock).text)
    .join("\n");
}

function normalizeAnalysis(input: unknown): Record<string, any> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, any>;
}

function getAngleScriptLimit(plan: PlanName) {
  if (plan === "PRO" || plan === "FLAGSHIP") return 3;
  if (plan === "CREATOR") return 1;
  return 0;
}

const SYSTEM_PROMPT = `你是一位專業的短影音內容策略師。
你的任務是根據一支已驗證有效的爆款分析結果，產生 3 個「延伸拍攝角度」。

重要規則：
1. 只能回傳 3 個角度，不要多也不要少
2. 每個角度都必須和原本主題高度相關，但切角不同
3. 不要亂發明不存在的政策、補助、法條、制度
4. 如果主題本身很窄（例如補助、法規、特定制度），請改從：
   - 常見錯誤
   - 常見誤解
   - 申請流程
   - 條件限制
   - 時間點
   - 案例
   - 反常識觀點
   這些角度延伸，而不是硬生新主題
5. 每個角度都要有一個短影音 Hook
6. 請用繁體中文
7. 只回傳 JSON，不要多餘文字

JSON 格式：
{
  "angles": [
    {
      "id": 1,
      "angle": "延伸角度標題",
      "hook": "這個角度的短影音開頭 Hook",
      "whyThisWorks": "一句話說明這個角度為什麼值得拍"
    },
    {
      "id": 2,
      "angle": "延伸角度標題",
      "hook": "這個角度的短影音開頭 Hook",
      "whyThisWorks": "一句話說明這個角度為什麼值得拍"
    },
    {
      "id": 3,
      "angle": "延伸角度標題",
      "hook": "這個角度的短影音開頭 Hook",
      "whyThisWorks": "一句話說明這個角度為什麼值得拍"
    }
  ]
}`;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAiEnabled())) {
    return NextResponse.json(
      { error: "AI 系統暫時關閉" },
      { status: 503 }
    );
  }

  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    const rate = await assertRateLimit({
      req,
      userId,
      routeKey: "angles",
      limit: getGenerateRateLimit(),
      windowMinutes: 1,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "操作太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY 未設定" },
        { status: 500 }
      );
    }

    const plan = await getUserPlan(userId);
    const angleScriptLimitPerVideo = getAngleScriptLimit(plan);

    const item = await prisma.viralDatabase.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "找不到影片資料" }, { status: 404 });
    }

    const analysis = normalizeAnalysis(item.analysis);
    const existingAngles = Array.isArray(analysis?.nextAngles)
      ? analysis.nextAngles
      : [];

    if (existingAngles.length > 0) {
      return NextResponse.json({
        success: true,
        cached: true,
        item: {
          ...item,
          analysis,
        },
        meta: {
          plan,
          angleScriptLimitPerVideo,
        },
      });
    }

    const costGuard = await assertCostGuard("GENERATE_IDEAS");
    if (!costGuard.allowed) {
      return NextResponse.json(
        {
          error: "系統今日 AI 成本保護已啟動，請稍後再試",
          code: costGuard.message,
        },
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
          error: `本月生成次數已達上限 ${usage.limit} 次，已使用 ${usage.used} 次，請升級方案繼續使用`,
          limitReached: true,
          upgradeRequired: true,
          used: usage.used,
          limit: usage.limit,
          remaining: usage.remaining,
        },
        { status: 403 }
      );
    }

    const prompt = `請根據以下爆款分析結果，生成 3 個最值得拍的延伸角度。

影片主題：
${analysis?.coreTopic || "未提供"}

目標受眾：
${analysis?.targetAudience || "未提供"}

原本 Hook：
${analysis?.hook || "未提供"}

摘要：
${analysis?.summary || "未提供"}

爆款原因：
${JSON.stringify(analysis?.viralReasons || [], null, 2)}

痛點：
${JSON.stringify(analysis?.painPoints || [], null, 2)}

情緒：
${analysis?.emotion || "未提供"}

CTA：
${analysis?.ctaType || "未提供"}

爆款公式：
${analysis?.combinedFormula || "未提供"}

請嚴格依照 JSON 格式回傳。`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      temperature: 0.7,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: prompt }],
    });

    const text = extractTextFromClaude(response.content);

    let result: Record<string, any>;
    try {
      result = safeParseJson(text);
    } catch {
      return NextResponse.json(
        { error: "Claude 回傳格式不是 JSON", raw: text },
        { status: 500 }
      );
    }

    const angles = Array.isArray(result?.angles) ? result.angles.slice(0, 3) : [];

    if (angles.length === 0) {
      return NextResponse.json(
        { error: "延伸角度生成失敗" },
        { status: 500 }
      );
    }

    const normalizedAngles = angles.map((angle: any, index: number) => ({
      id: Number(angle?.id || index + 1),
      angle: String(angle?.angle || "").trim(),
      hook: String(angle?.hook || "").trim(),
      whyThisWorks: String(angle?.whyThisWorks || "").trim(),
      generatedScript: null,
    }));

    const nextAnalysis = {
      ...analysis,
      nextAngles: normalizedAngles,
    };

    const updated = await prisma.viralDatabase.update({
      where: {
        id: item.id,
      },
      data: {
        analysis: nextAnalysis,
      },
    });

    await logUsage(userId, "GENERATE_IDEAS");
    await recordEstimatedCost("GENERATE_IDEAS");

    return NextResponse.json({
      success: true,
      cached: false,
      item: updated,
      meta: {
        plan,
        angleScriptLimitPerVideo,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("generate angles error:", err);

    return NextResponse.json(
      { error: "生成延伸角度失敗" },
      { status: 500 }
    );
  }
}