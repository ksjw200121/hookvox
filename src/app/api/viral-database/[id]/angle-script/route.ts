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

const SYSTEM_PROMPT = `你是一位專業的短影音腳本總編。
你的任務是根據「既有爆款分析」與「指定延伸角度」，生成一份可直接拍攝的短影音腳本。

重要規則：
1. 只生成 1 份腳本
2. 請用繁體中文
3. 腳本要口語、好拍、節奏快
4. 一定要有：
   - hook
   - fullScript
   - cta
   - scenes（5個分鏡）
5. scenes 格式：
   - id
   - timeRange
   - visualContent
   - voiceover
   - caption
   - shootingTip
   - purpose
6. 不要偏離原本影片的爆款邏輯
7. 只回傳 JSON，不要多餘文字

JSON 格式：
{
  "script": {
    "hook": "",
    "fullScript": "",
    "cta": "",
    "scenes": [
      {
        "id": 1,
        "timeRange": "0-3秒",
        "visualContent": "",
        "voiceover": "",
        "caption": "",
        "shootingTip": "",
        "purpose": "鉤子"
      },
      {
        "id": 2,
        "timeRange": "3-15秒",
        "visualContent": "",
        "voiceover": "",
        "caption": "",
        "shootingTip": "",
        "purpose": "建立共鳴/痛點"
      },
      {
        "id": 3,
        "timeRange": "15-35秒",
        "visualContent": "",
        "voiceover": "",
        "caption": "",
        "shootingTip": "",
        "purpose": "核心內容/乾貨"
      },
      {
        "id": 4,
        "timeRange": "35-50秒",
        "visualContent": "",
        "voiceover": "",
        "caption": "",
        "shootingTip": "",
        "purpose": "高潮/轉折"
      },
      {
        "id": 5,
        "timeRange": "50-60秒",
        "visualContent": "",
        "voiceover": "",
        "caption": "",
        "shootingTip": "",
        "purpose": "CTA"
      }
    ]
  }
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
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const rate = await assertRateLimit({
      req,
      userId,
      routeKey: "angle-script",
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

    const body = await req.json();
    const angleId = Number(body?.angleId);

    if (!angleId) {
      return NextResponse.json({ error: "缺少 angleId" }, { status: 400 });
    }

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
    const nextAngles = Array.isArray(analysis?.nextAngles) ? analysis.nextAngles : [];

    if (nextAngles.length === 0) {
      return NextResponse.json(
        { error: "請先生成爆款延伸角度" },
        { status: 400 }
      );
    }

    const angleIndex = nextAngles.findIndex((angle: any) => Number(angle?.id) === angleId);

    if (angleIndex === -1) {
      return NextResponse.json(
        { error: "找不到指定的延伸角度" },
        { status: 404 }
      );
    }

    const selectedAngle = nextAngles[angleIndex];

    const plan = await getUserPlan(userId);
    const angleScriptLimitPerVideo = getAngleScriptLimit(plan);

    if (selectedAngle?.generatedScript) {
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

    if (angleScriptLimitPerVideo <= 0) {
      return NextResponse.json(
        {
          error: "此方案尚未開放延伸腳本生成功能，請升級 Creator 或 Pro",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const generatedCount = nextAngles.filter((angle: any) => angle?.generatedScript).length;

    if (generatedCount >= angleScriptLimitPerVideo) {
      return NextResponse.json(
        {
          error:
            plan === "CREATOR"
              ? "Creator 方案每支影片只能生成 1 個延伸腳本，升級 Pro 可解鎖 3 個"
              : `此方案每支影片最多可生成 ${angleScriptLimitPerVideo} 個延伸腳本`,
          upgradeRequired: plan !== "PRO" && plan !== "FLAGSHIP",
          meta: {
            plan,
            angleScriptLimitPerVideo,
            generatedCount,
          },
        },
        { status: 403 }
      );
    }

    const costGuard = await assertCostGuard("GENERATE_ANGLE_SCRIPT");
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

    const prompt = `請根據以下資料，生成一份延伸短影音腳本。

原本核心主題：
${analysis?.coreTopic || "未提供"}

原本 Hook：
${analysis?.hook || "未提供"}

原本摘要：
${analysis?.summary || "未提供"}

目標受眾：
${analysis?.targetAudience || "未提供"}

原本爆款原因：
${JSON.stringify(analysis?.viralReasons || [], null, 2)}

原本痛點：
${JSON.stringify(analysis?.painPoints || [], null, 2)}

原本情緒：
${analysis?.emotion || "未提供"}

原本 CTA：
${analysis?.ctaType || "未提供"}

原本爆款公式：
${analysis?.combinedFormula || "未提供"}

指定延伸角度：
${selectedAngle?.angle || "未提供"}

指定 Hook：
${selectedAngle?.hook || "未提供"}

為什麼值得拍：
${selectedAngle?.whyThisWorks || "未提供"}

請嚴格依照 JSON 格式回傳。`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2600,
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

    const script = result?.script;

    if (!script?.hook || !script?.fullScript) {
      return NextResponse.json(
        { error: "延伸腳本生成失敗" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const updatedAngles = nextAngles.map((angle: any, index: number) => {
      if (index !== angleIndex) return angle;
      return {
        ...angle,
        generatedScript: {
          hook: script?.hook || "",
          fullScript: script?.fullScript || "",
          cta: script?.cta || "",
          scenes: Array.isArray(script?.scenes) ? script.scenes : [],
          generatedAt: now,
        },
      };
    });

    const nextAnalysis = {
      ...analysis,
      nextAngles: updatedAngles,
    };

    const updated = await prisma.viralDatabase.update({
      where: {
        id: item.id,
      },
      data: {
        analysis: nextAnalysis,
      },
    });

    await logUsage(userId, "GENERATE_SCRIPT");
    await recordEstimatedCost("GENERATE_ANGLE_SCRIPT");

    return NextResponse.json({
      success: true,
      cached: false,
      item: updated,
      meta: {
        plan,
        angleScriptLimitPerVideo,
        generatedCount: updatedAngles.filter((angle: any) => angle?.generatedScript).length,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("generate angle script error:", err);

    return NextResponse.json(
      { error: err?.message || "生成延伸腳本失敗" },
      { status: 500 }
    );
  }
}