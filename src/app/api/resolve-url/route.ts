import { NextResponse } from "next/server";
import { parsePublicUrl } from "@/lib/url-parser";
import { getUserIdFromRequest } from "@/lib/usage-checker";
import { assertRateLimit, getAnalyzeRateLimit } from "@/lib/security-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    const rate = await assertRateLimit({
      req,
      userId,
      routeKey: "resolve-url",
      limit: Math.max(getAnalyzeRateLimit(), 10),
      windowMinutes: 1,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "操作太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const url = String(body?.url || "").trim();

    if (!url) {
      return NextResponse.json(
        { error: "缺少網址" },
        { status: 400 }
      );
    }

    const parsed = await parsePublicUrl(url);

    return NextResponse.json({
      success: true,
      parsed,
      needsManualHelp: !parsed.resolvedText,
    });
  } catch (error: any) {
    console.error("resolve-url error:", error);

    return NextResponse.json(
      {
        error: error?.message || "網址解析失敗",
      },
      { status: 500 }
    );
  }
}