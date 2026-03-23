import { isAiEnabled } from "@/lib/ai-switch";
import { sanitizeApiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  logUsage,
} from "@/lib/usage-checker";
import {
  assertCostGuard,
  assertRateLimit,
  getGenerateRateLimit,
  recordEstimatedCost,
} from "@/lib/security-guard";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCRIPT_SYSTEM_PROMPT = `你是一位專業的爆款短影音腳本生成師，熟悉 IG Reels / TikTok / YouTube Shorts 演算法，擅長根據爆款公式生成高轉換率腳本。

【與 IG 爆款結構對齊】
- 前 3 秒決定是否被滑走：hook 必須是「衝突／痛點／數字／問句／反差」之一，讓人無法滑走。
- 結構建議：鉤子(0–3秒) → 共鳴/痛點(讓觀眾覺得「這在說我」) → 解方/乾貨(具體、可操作) → 舉例或情境(具象化) → CTA(具體行動)。
- 衝突前置、價值後置：開頭先製造懸念或痛點，再給解方，不要先講背景再進主題。
- 口語、短句、像真人對鏡頭講話；禁止「今天來跟大家分享」「你一定要知道」「非常重要」「讓我們一起了解」等 AI 腔。

【最重要的原則 — 違反此規則等於失敗】
你的工作是「提取爆款公式，套用到用戶的主題」，不是改寫或重組原影片。
- 你要學的是「結構」：Hook 類型、內容節奏、情緒曲線、CTA 手法
- 你要丟掉的是「內容」：原影片的具體數字、日期、金額、人名、案例、政策名稱
- 如果生成的腳本跟原影片講同一件事 = 你失敗了
- 正確做法：原影片講農漁民學金，用戶主題是美業 → 你的腳本要講美業，結構模仿原影片

你的任務：
1. 根據分析結果，提取爆款公式的核心元素（Hook 類型、結構、情緒觸發方式）
2. 生成 8 個吸引點擊的標題（句型多元：數字、問句、反差、利益型等）
3. 生成 3 份不同風格的完整腳本（A / B / C），內容必須圍繞「用戶主題」，不是原影片主題
4. 如果需要分鏡，請從 A / B / C 中選出最適合拍攝的一個版本，填入 bestScriptVersion，並且只幫那一個版本生成完整分鏡 scenes
5. 其他沒有被選中的版本，scenes 一律回傳空陣列 []

重要規則：
- 三份腳本都要完整寫出來，不能偷懶
- 三份腳本要有明顯差異，例如：對話/演戲型、數字衝擊型、身份認同型（或情緒型、故事型、直球型）
- 每份腳本都要有 hook、fullScript、cta；fullScript 要能直接對著鏡頭念，每句不要太長
- 只有最佳版本才有 scenes
- 如果本次不需要分鏡：
  - bestScriptVersion 請填空字串 ""
  - 三份 scripts 的 scenes 都回傳 []

分鏡格式要求（只有被選中的最佳版本需要）：
- 每個分鏡都要包含完整欄位：id、timeRange、shotType、visualContent、voiceover、caption、shootingTip、purpose
- 前 3 秒必須是強力鉤子（痛點或衝突或數字問句）
- 中段有轉折/衝突/乾貨，節奏緊湊
- 結尾有明確 CTA
- 建議 5 個分鏡，適合 60 秒內短影音拍攝

回傳純 JSON，不要有任何額外文字：
{
  "titles": [
    "標題1",
    "標題2",
    "標題3",
    "標題4",
    "標題5",
    "標題6",
    "標題7",
    "標題8"
  ],
  "bestScriptVersion": "A",
  "scripts": [
    {
      "version": "A",
      "hook": "開場鉤子文案（前3秒，讓人無法滑走）",
      "scenes": [
        {
          "id": 1,
          "timeRange": "0-3秒",
          "shotType": "特寫 / 中景 / 遠景 / 手部特寫 / 螢幕錄影",
          "visualContent": "畫面描述（做什麼動作、展示什麼）",
          "voiceover": "旁白台詞",
          "caption": "疊字字幕",
          "shootingTip": "拍攝建議",
          "purpose": "鉤子"
        },
        {
          "id": 2,
          "timeRange": "3-15秒",
          "shotType": "特寫 / 中景 / 遠景 / 手部特寫 / 螢幕錄影",
          "visualContent": "畫面描述",
          "voiceover": "旁白台詞",
          "caption": "疊字字幕",
          "shootingTip": "拍攝建議",
          "purpose": "建立共鳴/痛點"
        },
        {
          "id": 3,
          "timeRange": "15-40秒",
          "shotType": "特寫 / 中景 / 遠景 / 手部特寫 / 螢幕錄影",
          "visualContent": "畫面描述",
          "voiceover": "旁白台詞",
          "caption": "疊字字幕",
          "shootingTip": "拍攝建議",
          "purpose": "核心內容/乾貨"
        },
        {
          "id": 4,
          "timeRange": "40-55秒",
          "shotType": "特寫 / 中景 / 遠景 / 手部特寫 / 螢幕錄影",
          "visualContent": "畫面描述",
          "voiceover": "旁白台詞",
          "caption": "疊字字幕",
          "shootingTip": "拍攝建議",
          "purpose": "高潮/轉折"
        },
        {
          "id": 5,
          "timeRange": "55-60秒",
          "shotType": "特寫 / 中景 / 遠景 / 手部特寫 / 螢幕錄影",
          "visualContent": "畫面描述",
          "voiceover": "旁白台詞",
          "caption": "疊字字幕",
          "shootingTip": "拍攝建議",
          "purpose": "CTA"
        }
      ],
      "fullScript": "完整連貫的腳本文字（可直接對著鏡頭念）",
      "cta": "結尾行動呼籲文案"
    },
    {
      "version": "B",
      "hook": "開場鉤子文案（前3秒，讓人無法滑走）",
      "scenes": [],
      "fullScript": "完整連貫的腳本文字（可直接對著鏡頭念）",
      "cta": "結尾行動呼籲文案"
    },
    {
      "version": "C",
      "hook": "開場鉤子文案（前3秒，讓人無法滑走）",
      "scenes": [],
      "fullScript": "完整連貫的腳本文字（可直接對著鏡頭念）",
      "cta": "結尾行動呼籲文案"
    }
  ],
  "adaptedVersion": {
    "enabled": false,
    "topic": "",
    "hook": "",
    "fullScript": ""
  }
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

function normalizeAnalysis(input: unknown): Record<string, any> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, any>;
}

function getGeneratedPayload(analysis: Record<string, any>) {
  const generated =
    analysis?.generated &&
    typeof analysis.generated === "object" &&
    !Array.isArray(analysis.generated)
      ? analysis.generated
      : {};

  return {
    titles: Array.isArray(generated?.titles) ? generated.titles : [],
    bestScriptVersion:
      typeof generated?.bestScriptVersion === "string"
        ? generated.bestScriptVersion
        : "",
    scripts: Array.isArray(generated?.scripts) ? generated.scripts : [],
    storyboard: Array.isArray(generated?.storyboard)
      ? generated.storyboard
      : [],
    adaptedVersion:
      generated?.adaptedVersion &&
      typeof generated.adaptedVersion === "object" &&
      !Array.isArray(generated.adaptedVersion)
        ? generated.adaptedVersion
        : {
            enabled: false,
            topic: "",
            hook: "",
            fullScript: "",
          },
  };
}

function buildStoryboardFromScripts(
  scripts: any[],
  bestScriptVersion: string
): any[] {
  if (!Array.isArray(scripts) || scripts.length === 0) return [];

  const best =
    scripts.find((script) => script?.version === bestScriptVersion) || scripts[0];

  if (!Array.isArray(best?.scenes)) return [];

  return best.scenes.map((scene: any, index: number) => ({
    id: scene?.id ?? index + 1,
    scene: scene?.scene ?? scene?.id ?? index + 1,
    timeRange: scene?.timeRange || "",
    shotType: scene?.shotType || "",
    visualContent: scene?.visualContent || scene?.visual || "",
    voiceover: scene?.voiceover || "",
    caption: scene?.caption || "",
    shootingTip: scene?.shootingTip || "",
    purpose: scene?.purpose || "",
  }));
}

async function findExistingViralEntry(userId: string, url?: string, transcript?: string) {
  if (url) {
    const byUrl = await prisma.viralDatabase.findFirst({
      where: {
        userId,
        videoUrl: url,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (byUrl) return byUrl;
  }

  if (transcript) {
    const byTranscript = await prisma.viralDatabase.findFirst({
      where: {
        userId,
        transcript,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (byTranscript) return byTranscript;
  }

  return null;
}

export async function POST(req: Request) {

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
      routeKey: "generate",
      limit: getGenerateRateLimit(),
      windowMinutes: 1,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "操作太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      url,
      industry,
      topic,
      targetAudience,
      ctaGoal,
      analysis,
      substitution,
      wantStoryboard,
      transcript,
      userTopic,
    } = body || {};

    if (!analysis || !String(JSON.stringify(analysis)).trim()) {
      return NextResponse.json({ error: "缺少分析資料" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY 未設定" },
        { status: 500 }
      );
    }

    const existingEntry = await findExistingViralEntry(
      userId,
      typeof url === "string" ? url.trim() : "",
      typeof transcript === "string" ? transcript.trim() : ""
    );

    const existingAnalysis = existingEntry?.analysis
      ? normalizeAnalysis(existingEntry.analysis)
      : normalizeAnalysis(analysis);

    const cachedGenerated = getGeneratedPayload(existingAnalysis);

    if (
      cachedGenerated.titles.length > 0 &&
      cachedGenerated.scripts.length > 0
    ) {
      const cachedUsage = await checkUsageLimit(userId, "GENERATE");
      return NextResponse.json({
        success: true,
        cached: true,
        titles: cachedGenerated.titles,
        bestScriptVersion: cachedGenerated.bestScriptVersion,
        scripts: cachedGenerated.scripts,
        storyboard: cachedGenerated.storyboard,
        adaptedVersion: cachedGenerated.adaptedVersion,
        usage: {
          used: cachedUsage.used,
          limit: cachedUsage.limit,
          remaining: cachedUsage.remaining,
        },
      });
    }

    const costGuard = await assertCostGuard("GENERATE_SCRIPT");
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

    const publicUserId = usage.publicUserId ?? userId;
    const finalTopic = userTopic || substitution || topic || "";
    const storyboardRequired = Boolean(wantStoryboard);

    const userPrompt = `請根據以下爆款影片分析，生成腳本和標題。

## 行業
${industry || "GENERAL"}

## 爆款分析結果
${JSON.stringify(existingAnalysis, null, 2)}

## 原始逐字稿（僅供參考風格語氣，禁止複製內容）
${transcript ? String(transcript).slice(0, 1500) : "（無）"}

## 用戶主題
${finalTopic || "（⚠️ 用戶未提供主題。你必須自行挑選一個完全不同的主題來示範。例如：原影片講『農漁民學金』，你就換成『勞保年金』或『租屋補助』或『育兒津貼』等完全不同的政策/主題。禁止沿用原影片的任何具體數字、日期、金額、人物、案例。只學它的結構：Hook類型 + 內容節奏 + CTA手法。）"}

## 目標受眾
${targetAudience || "（未提供）"}

## CTA 目標
${ctaGoal || "（未提供）"}

## 是否需要分鏡
${
  storyboardRequired
    ? "需要。請在 A/B/C 三份腳本中自行選出最適合的一份作為 bestScriptVersion，並且只有那一份要生成完整 scenes。"
    : "不需要。bestScriptVersion 請填空字串，三份 scripts 的 scenes 全部回傳空陣列。"
}

## 套用主題規則
${
  finalTopic
    ? `請把內容套用到「${finalTopic}」這個主題。adaptedVersion.enabled 設為 true，並填入對應內容。`
    : "adaptedVersion.enabled 保持 false。"
}

請嚴格按照 system prompt 的 JSON 格式回傳。`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      temperature: 0.7,
      system: [
        {
          type: "text",
          text: SCRIPT_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
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

    const titles = Array.isArray(result?.titles) ? result.titles : [];
    const scripts = Array.isArray(result?.scripts) ? result.scripts : [];
    const bestScriptVersion =
      typeof result?.bestScriptVersion === "string"
        ? result.bestScriptVersion
        : "";
    const storyboard = buildStoryboardFromScripts(scripts, bestScriptVersion);
    const adaptedVersion =
      result?.adaptedVersion &&
      typeof result.adaptedVersion === "object" &&
      !Array.isArray(result.adaptedVersion)
        ? result.adaptedVersion
        : {
            enabled: false,
            topic: "",
            hook: "",
            fullScript: "",
          };

    if (titles.length === 0 || scripts.length === 0) {
      return NextResponse.json(
        { error: "生成失敗，AI 未回傳完整內容" },
        { status: 500 }
      );
    }

    if (existingEntry) {
      const now = new Date().toISOString();

      const nextAnalysis = {
        ...existingAnalysis,
        generated: {
          ...(existingAnalysis.generated || {}),
          titles,
          bestScriptVersion,
          scripts,
          storyboard,
          adaptedVersion,
          generatedAt: existingAnalysis.generated?.generatedAt || now,
          updatedAt: now,
        },
      };

      await prisma.viralDatabase.update({
        where: {
          id: existingEntry.id,
        },
        data: {
          analysis: nextAnalysis,
        },
      });
    }

    await logUsage(publicUserId, "GENERATE_SCRIPT");
    await recordEstimatedCost("GENERATE_SCRIPT");

    return NextResponse.json({
      success: true,
      cached: false,
      titles,
      bestScriptVersion,
      scripts,
      storyboard,
      adaptedVersion,
      usage: {
        used: usage.used + 1,
        limit: usage.limit,
        remaining: Math.max(usage.limit - (usage.used + 1), 0),
      },
    });
  } catch (error: unknown) {
    console.error("generate error:", error);
    const sanitized = sanitizeApiError(error, "生成失敗，請稍後再試");
    return NextResponse.json(
      { error: sanitized.message },
      { status: sanitized.status }
    );
  }
}