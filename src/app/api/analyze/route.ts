import { isAiEnabled } from "@/lib/ai-switch";
import { sanitizeApiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { toFile } from "openai/uploads";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  ensurePublicUserBySupabaseId,
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
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ANALYZE_UPLOADS_BUCKET = "analyze-uploads";
const MAX_INLINE_UPLOAD_BYTES = 24 * 1024 * 1024;

const WHISPER_SUPPORTED_EXT = ["flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"];

/** 逐字稿字數上限，避免單次請求 token 與成本過大 */
const MAX_TRANSCRIPT_LENGTH = 50000;

function isWhisperSupportedExt(ext: string): boolean {
  return WHISPER_SUPPORTED_EXT.includes(ext.toLowerCase());
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `你是以 IG Reels 為主的短影音爆款內容分析師，熟悉台灣 IG 演算法與 Reels 推薦邏輯，兼顧 TikTok、YouTube Shorts 的共通原則。輸出要「具體、可執行」，讓創作者能直接套用，不要空泛形容詞。

創作者常卡關的真相：你現在最大的問題不是努力不夠，而是拆解拆錯重點。你的分析要幫他「拆對重點」——開場有沒有事件感、有沒有情境共鳴、畫面與留粉設計是否到位。

【重要】只根據「逐字稿內容」分析。逐字稿裡沒有提到的不要臆測，該欄位可填 null 或空陣列。不要瞎掰數據或細節。

【IG 專屬】
- Reels 會出現在探索與推薦欄位；要留粉需「主題一致」＋「資訊價值」。分析時可註明此片較適合 Reels 或貼文。
- 引流＝引留。引到版面卻流失，再多的流量都沒用；分析時可看 cta／結尾是否有留粉設計。
- 演算法和觀眾不會聽你講專業，它只看第一眼的視覺訊號。IG 畫面偏好：乾淨、留白、主視覺清楚、字體一致；避免雜亂、太滿、字體忽大忽小。
- 完播／互動參考（供解讀爆款用）：完播盡量 15～30 秒；按讚約 5%～10%；留言／分享約觀看 0.1%；珍藏約 0.2%。

【爆款的本質】
- 完播 → 選題對
- 按讚 → 共鳴與共情
- 留言 → 話題感與參與感
- 收藏 → 有用
- 分享 → 你說出我想說的話

【演算法偏好】
- 衝突、認知反差、情緒 > 履歷和專業
- 先讓人覺得有事發生，才輪得到你說話。正確順序：事件/衝突/錯誤 → 才輪到專業
- 情境導向，不是知識導向：觀眾腦中會出現「欸，這好像就是我現在的狀況」才叫到位。若為金融/專業類，從情境、痛點、代價切入，而非從術語或產品開始。

【好開頭 vs 壞開頭】
壞：「今天來分享一個知識給大家」「最近很多人問」「我來教你」「今天跟你分享」、日常紀錄型開場
好：「為什麼我媽工作30年，勞退少領30萬？」、直接給結果／點痛點／講代價（不做會怎樣）

【法規與合規】
- 不臆測或生成違反法律、具誤導性、易被檢舉或導致民事/行政責任的內容。
- 金融/投資/保險類：不生成保證獲利、未經核准的投資建議、不當比較、誤導性數字。若內容涉及此類，在分析或建議中提醒「僅供參考，不構成投資/投保建議，創作者須自行確認合規並遵守當地法規（含金融招攬規定）」。
- 其他行業（醫療、法律、食品等）：若涉及專業或商業宣稱，可註明「創作者須自行確認符合該行業法規」。

【輸出品質】
- hook：必須是「可直接當影片第一句念出來」的完整一句話，不要寫成標題或摘要。
- keyFormula：要讓別人能直接套用到自己的題目（例如「先講錯誤結果＋再講正確做法＋最後一句金句」）。
- emotionalTriggers / viralReasons：寫「具體觸發情境」與「誰在什麼情境會共鳴」，不要只寫「很有共鳴」「很實用」。
- replicability 高 = 結構可拆解、換成別的主題也能套用；低 = 太依賴這支片獨有情境或個人魅力。

【鉤子類型】可選：錯誤揭露型、衝突懸念型、數字震撼型、反常識型、恐懼警示型、故事懸念型、身份對比型、承諾型（你只要做 X 就能 Y）。

【評分 1～10 準則】
- hookScore：開頭是否 3 秒內抓住注意力、讓人想繼續看。無力或老套給 4～6；明確、可複製給 7～10。
- viralPotential：整體爆款潛力。空洞或難共鳴給 4～6；情緒與結構都到位給 7～10。
- replicability：別人能否套用。太個人化或難拆解給 4～6；公式清楚、可換題目套用給 7～10。

規則：繁體中文、白話直接、只回傳合法 JSON、不要 markdown、直接從 { 開始

{
  "coreTopic": "核心在講什麼（一句話）",
  "targetAudience": "目標受眾：年齡、狀態、最大焦慮（具體描述）",
  "hook": "適合作為影片第一句話的開頭 hook（直接輸出一句話，可照念）",
  "hookStyle": "鉤子類型（從上列類型選一或簡短描述）",
  "hookScore": 8,
  "hookAnalysis": "這個開頭為什麼有效或無效（具體原因）",
  "viralPotential": 8,
  "emotionalTriggers": ["具體情緒點與觸發情境", "…"],
  "contentStructure": ["開場做了什麼", "中段做了什麼", "結尾做了什麼"],
  "persuasionMechanics": ["說服機制1", "說服機制2", "說服機制3"],
  "viralReasons": ["爆紅原因（心理學/演算法角度，具體）", "…"],
  "keyAngles": ["可借用角度（換成自己的題目也能用）", "…"],
  "replicability": 8,
  "ctaStyle": "怎麼引導互動或轉換",
  "keyFormula": "核心爆款公式（一句話，可複製的邏輯，別人能套用）",
  "summary": "白話總結：為什麼有效",
  "painPoints": ["受眾痛點1", "痛點2"],
  "keyInsights": ["關鍵洞察1", "洞察2"],
  "contentCategory": "內容類型（知識教學/故事/搞笑/日常生活/工作日常/理財/職涯 等，若不明填 GENERAL）",
  "igNote": "選填。此片較適合 Reels 或貼文、版面或畫面建議，無則 null",
  "complianceNote": "選填。若涉及金融/投資/保險/醫療等須合規提醒時簡短一句，無則 null"
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
  const trimmed = raw.trim().replace(/^\uFEFF/, "");

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/```\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {}
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      const noTrailingCommas = candidate.replace(/,\s*([}\]])/g, "$1");
      try {
        return JSON.parse(noTrailingCommas);
      } catch {}
    }
  }

  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned.replace(/,\s*([}\]])/g, "$1"));
}

function isBlockedPlatform(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "instagram.com" ||
      hostname === "www.instagram.com" ||
      hostname === "tiktok.com" ||
      hostname === "www.tiktok.com" ||
      hostname === "vm.tiktok.com"
    );
  } catch {
    return false;
  }
}

function isYouTubeShortsUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const allowedHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
    return allowedHosts.has(hostname) && pathname.startsWith("/shorts/");
  } catch {
    return false;
  }
}

function getApproxBase64Bytes(input: string) {
  const normalized = input.replace(/^data:[^;]+;base64,/, "").trim();
  return Math.floor((normalized.length * 3) / 4);
}

export async function POST(req: Request) {
  if (!(await isAiEnabled())) {
    return NextResponse.json({ error: "AI 系統暫時關閉" }, { status: 503 });
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "登入狀態已過期，請重新登入後再試" },
        { status: 401 }
      );
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
        const existingAnalysis = (existing.analysis || {}) as Record<string, unknown>;
        const normalizedExisting: Record<string, unknown> = {
          ...existingAnalysis,
        };
        const anyExisting = existingAnalysis as any;
        if (!normalizedExisting.hookModel) {
          normalizedExisting.hookModel =
            anyExisting?.hookModel ||
            anyExisting?.hookStyle ||
            anyExisting?.hookType ||
            "";
        }
        if (!normalizedExisting.hook) {
          normalizedExisting.hook =
            anyExisting?.hook ||
            anyExisting?.opening ||
            (Array.isArray(anyExisting?.contentStructure)
              ? anyExisting.contentStructure[0]
              : "") ||
            "";
        }

        if (JSON.stringify(normalizedExisting) !== JSON.stringify(existingAnalysis)) {
          await prisma.viralDatabase.update({
            where: { id: existing.id },
            data: { analysis: normalizedExisting as Prisma.InputJsonValue },
          });
        }

        const cachedUsage = await checkUsageLimit(userId, "ANALYZE");

        return NextResponse.json({
          success: true,
          cached: true,
          transcript: existing.transcript || "",
          analysis: normalizedExisting,
          usage: {
            used: cachedUsage.used,
            limit: cachedUsage.limit,
            remaining: cachedUsage.remaining,
          },
          message: "這支影片你之前分析過了，直接顯示上次的結果，不會再扣一次額度",
        });
      }
    }

    const costGuard = await assertCostGuard("ANALYZE");
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "系統今日 AI 成本保護已啟動，請稍後再試", code: costGuard.message },
        { status: 503 }
      );
    }

    const usage = await checkUsageLimit(userId, "ANALYZE");
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
    const publicUser = await ensurePublicUserBySupabaseId(userId);

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
      } else if (body?.storagePath && typeof body.storagePath === "string") {
        const storagePath = String(body.storagePath).trim();
        if (!storagePath.startsWith(userId + "/") && !storagePath.startsWith(userId + "\\")) {
          return NextResponse.json(
            { error: "無效的檔案路徑" },
            { status: 400 }
          );
        }
        const supabaseAdmin = getSupabaseAdmin();
        const { data: blob, error: downloadError } = await supabaseAdmin.storage
          .from(ANALYZE_UPLOADS_BUCKET)
          .download(storagePath);

        if (downloadError || !blob) {
          return NextResponse.json(
            { error: "無法讀取上傳檔案，請重新上傳" },
            { status: 400 }
          );
        }

        if (blob.size > MAX_INLINE_UPLOAD_BYTES) {
          await supabaseAdmin.storage.from(ANALYZE_UPLOADS_BUCKET).remove([storagePath]);
          return NextResponse.json(
            { error: "檔案過大。目前轉錄服務單檔上限約 25MB，請先壓縮到 24MB 以下再上傳。" },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await blob.arrayBuffer());
        const filename = storagePath.replace(/\\/g, "/").split("/").pop() || "";
        const ext = (filename && filename.includes(".")) ? filename.split(".").pop()!.toLowerCase() : "mp4";
        const knownUnsupported = ["mov", "avi", "mkv", "wmv"];
        if (ext && knownUnsupported.includes(ext)) {
          return NextResponse.json(
            { error: `不支援的檔案格式 .${ext}，請先轉成 mp4 再上傳。` },
            { status: 400 }
          );
        }
        const safeExt = isWhisperSupportedExt(ext) ? ext : "mp4";
        const mimeType = safeExt === "mp3" || safeExt === "m4a" ? "audio/mpeg" : "video/mp4";
        const uploadedFile = await toFile(buffer, `input.${safeExt}`, { type: mimeType });

        let transcription: { text?: string | null };
        try {
          transcription = await openai.audio.transcriptions.create({
            file: uploadedFile,
            model: "whisper-1",
          });
        } catch (whisperErr: unknown) {
          await supabaseAdmin.storage.from(ANALYZE_UPLOADS_BUCKET).remove([storagePath]);
          const msg = (whisperErr as Error)?.message || "";
          if (msg.includes("Invalid file format") || msg.includes("unsupported format")) {
            return NextResponse.json(
              { error: "此檔案無法轉錄，請確認是 mp3 / mp4 / m4a / wav 等格式，且檔案未損壞。.mov 請先轉成 mp4。" },
              { status: 400 }
            );
          }
          throw whisperErr;
        }

        transcript = transcription.text?.trim() || "";

        await supabaseAdmin.storage.from(ANALYZE_UPLOADS_BUCKET).remove([storagePath]);

        if (!transcript) {
          return NextResponse.json(
            { error: "Whisper 無法辨識語音，請確認音訊品質" },
            { status: 500 }
          );
        }
      } else if (body?.audioBase64 || body?.videoBase64) {
        const base64 = String(body.audioBase64 || body.videoBase64 || "");
        const mimeType = body.audioBase64 ? "audio/mpeg" : "video/mp4";
        const fileName = body.audioBase64 ? "audio.mp3" : "video.mp4";
        const normalizedBase64 = base64.replace(/^data:[^;]+;base64,/, "").trim();
        if (!normalizedBase64) {
          return NextResponse.json({ error: "檔案內容為空" }, { status: 400 });
        }
        if (getApproxBase64Bytes(normalizedBase64) > MAX_INLINE_UPLOAD_BYTES) {
          return NextResponse.json(
            { error: "檔案過大。目前轉錄服務單檔上限約 25MB，請先壓縮到 24MB 以下再上傳。" },
            { status: 400 }
          );
        }
        const buffer = Buffer.from(normalizedBase64, "base64");

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

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        {
          error: `逐字稿過長（目前 ${transcript.length} 字），請精簡至 ${MAX_TRANSCRIPT_LENGTH} 字以內或分段分析`,
          code: "TRANSCRIPT_TOO_LONG",
        },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0,
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

    const normalizedAnalysis: Record<string, unknown> = {
      ...analysis,
    };

    const anyAnalysis = analysis as any;

    if (!normalizedAnalysis.hookModel) {
      normalizedAnalysis.hookModel =
        anyAnalysis?.hookModel ||
        anyAnalysis?.hookStyle ||
        anyAnalysis?.hookType ||
        "";
    }

    if (!normalizedAnalysis.hook) {
      normalizedAnalysis.hook =
        anyAnalysis?.hook ||
        anyAnalysis?.opening ||
        (Array.isArray(anyAnalysis?.contentStructure)
          ? anyAnalysis.contentStructure[0]
          : "") ||
        "";
    }

    await prisma.viralDatabase.create({
      data: {
        userId: publicUserId,
        publicUserId: publicUser?.id || null,
        videoUrl: url || `manual-${Date.now()}`,
        transcript,
        analysis: normalizedAnalysis as Prisma.InputJsonValue,
      },
    });

    await logUsage(publicUserId, "ANALYZE");
    await recordEstimatedCost("ANALYZE");

    return NextResponse.json({
      success: true,
      cached: false,
      transcript,
        analysis: normalizedAnalysis,
      usage: {
        used: usage.used + 1,
        limit: usage.limit,
        remaining: Math.max(usage.limit - (usage.used + 1), 0),
      },
    });
  } catch (error: unknown) {
    console.error("analyze error:", error);
    const sanitized = sanitizeApiError(error, "分析失敗，請稍後再試");
    return NextResponse.json(
      { error: sanitized.message },
      { status: sanitized.status }
    );
  }
}