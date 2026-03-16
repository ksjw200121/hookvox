import { NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  getWeekUsage,
} from "@/lib/usage-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyUsage = {
  analyze: {
    used: 0,
    limit: 0,
    remaining: 0,
    cycleStart: null as string | null,
    cycleEnd: null as string | null,
  },
  generate: {
    used: 0,
    limit: 0,
    remaining: 0,
    cycleStart: null as string | null,
    cycleEnd: null as string | null,
  },
  week: { analyze: 0, generate: 0 },
};

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const [analyzeUsage, generateUsage, weekUsage] = await Promise.all([
      checkUsageLimit(userId, "ANALYZE"),
      checkUsageLimit(userId, "GENERATE"),
      getWeekUsage(userId),
    ]);

    return NextResponse.json({
      plan: analyzeUsage.plan,
      usage: {
        analyze: {
          used: analyzeUsage.used,
          limit: analyzeUsage.limit,
          remaining: analyzeUsage.remaining,
          cycleStart: analyzeUsage.cycleStart,
          cycleEnd: analyzeUsage.cycleEnd,
        },
        generate: {
          used: generateUsage.used,
          limit: generateUsage.limit,
          remaining: generateUsage.remaining,
          cycleStart: generateUsage.cycleStart,
          cycleEnd: generateUsage.cycleEnd,
        },
        week: {
          analyze: weekUsage.analyze,
          generate: weekUsage.generate,
        },
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("usage api error:", err);
    // 仍回傳 200 + 預設額度，避免帳單頁「無法載入額度」
    return NextResponse.json({
      plan: "FREE",
      usage: {
        ...emptyUsage,
        analyze: { ...emptyUsage.analyze },
        generate: { ...emptyUsage.generate },
      },
      _error: err?.message || "伺服器錯誤",
    });
  }
}