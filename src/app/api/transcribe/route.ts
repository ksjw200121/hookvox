import { isAiEnabled } from "@/lib/ai-switch";
import { sanitizeApiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  logUsage,
} from "@/lib/usage-checker";
import {
  assertCostGuard,
  assertRateLimit,
  getAnalyzeRateLimit,
  recordEstimatedCost,
} from "@/lib/security-guard";
import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 用 ffmpeg-static 將 .mov/HEVC 轉成 .mp3（只抽音軌）
 */
async function convertToMp3(inputBuffer: Buffer): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath: string = require("ffmpeg-static");
  const id = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const inputPath = join(tmpdir(), `tr_in_${id}.mov`);
  const outputPath = join(tmpdir(), `tr_out_${id}.mp3`);

  await writeFile(inputPath, inputBuffer);

  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      ["-i", inputPath, "-vn", "-acodec", "libmp3lame", "-q:a", "4", "-y", outputPath],
      { timeout: 120_000 },
      async (err) => {
        unlink(inputPath).catch(() => {});
        if (err) {
          unlink(outputPath).catch(() => {});
          reject(new Error(`ffmpeg 轉檔失敗: ${err.message}`));
          return;
        }
        try {
          const mp3Buffer = await readFile(outputPath);
          unlink(outputPath).catch(() => {});
          resolve(mp3Buffer);
        } catch (readErr) {
          reject(new Error(`讀取轉檔結果失敗: ${(readErr as Error).message}`));
        }
      }
    );
  });
}

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "video/mp4",
  "video/quicktime",
];

export async function POST(req: Request) {
  if (!(await isAiEnabled())) {
    return NextResponse.json({ error: "AI 系統暫時關閉" }, { status: 503 });
  }

  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    // 🔴 新增：先檢查 ANALYZE 次數
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
        { error: "ANALYZE_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    const rate = await assertRateLimit({
      req,
      userId,
      routeKey: "transcribe",
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
        { error: "系統今日 AI 成本保護已啟動，請稍後再試" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "請提供音訊或影片檔案" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "不支援的檔案格式，請上傳 mp3 / mp4 / m4a / wav / mov" },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "檔案太大，請上傳 50MB 以內的檔案" },
        { status: 400 }
      );
    }

    let buffer: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
    let safeName = file.name || "input.mp4";
    let safeType = file.type || "video/mp4";

    // .mov / HEVC (iPhone 影片) 需要用 ffmpeg 轉成 mp3 才能送 Whisper
    const isMov = safeName.toLowerCase().endsWith(".mov") || safeType === "video/quicktime";
    if (isMov) {
      try {
        buffer = await convertToMp3(buffer);
        safeName = "input.mp3";
        safeType = "audio/mpeg";
      } catch (convErr) {
        console.error("ffmpeg conversion failed in transcribe:", convErr);
        // fallback: 試試直接改名送
        safeName = safeName.replace(/\.mov$/i, ".mp4");
        safeType = "video/mp4";
      }
    }
    const uploadedFile = await toFile(buffer, safeName, { type: safeType });

    const transcription = await openai.audio.transcriptions.create({
      file: uploadedFile,
      model: "whisper-1",
    });

    const transcript = transcription.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "無法辨識語音，請確認檔案有清楚的說話聲音" },
        { status: 500 }
      );
    }

    const publicUserId = usage.publicUserId ?? userId;
    await logUsage(publicUserId, "ANALYZE");
    await recordEstimatedCost("ANALYZE");

    return NextResponse.json({
      success: true,
      transcript,
      usage: {
        used: usage.used + 1,
        limit: usage.limit,
        remaining: Math.max(usage.limit - (usage.used + 1), 0),
      },
    });
  } catch (error: unknown) {
    console.error("transcribe error:", error);
    const sanitized = sanitizeApiError(error, "轉錄失敗，請稍後再試");
    return NextResponse.json(
      { error: sanitized.message },
      { status: sanitized.status }
    );
  }
}