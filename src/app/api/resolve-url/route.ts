import { NextResponse } from "next/server";
import { parsePublicUrl } from "@/lib/url-parser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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