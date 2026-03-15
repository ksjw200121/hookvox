import { isAiEnabled } from "@/lib/ai-switch";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import {
  getUserIdFromRequest,
  checkUsageLimit,
} from "@/lib/usage-checker";
import {
  assertCostGuard,
  assertRateLimit,
  getAnalyzeRateLimit,
} from "@/lib/security-guard";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 🔴 新增：先檢查 ANALYZE 次數
    const usage = await checkUsageLimit(userId, "ANALYZE");

    if (!usage.allowed) {
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await toFile(buffer, file.name, { type: file.type });

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

    return NextResponse.json({
      success: true,
      transcript,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("transcribe error:", err);

    return NextResponse.json(
      { error: err?.message || "轉錄失敗，請重試" },
      { status: 500 }
    );
  }
}