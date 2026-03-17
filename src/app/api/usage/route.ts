import { NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  getWeekUsage,
  getPlanForSupabaseIdSafe,
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
    // 仍回傳 200，且盡量帶入與帳單一致的方案，避免控制台/方案頁顯示免費、帳單卻顯示訂閱中
    let fallbackPlan = "FREE";
    try {
      const userId = await getUserIdFromRequest(req);
      if (userId) fallbackPlan = await getPlanForSupabaseIdSafe(userId);
    } catch {
      // 忽略
    }
    const limits = {
      FREE: { analyze: 3, generate: 3 },
      CREATOR: { analyze: 50, generate: 50 },
      PRO: { analyze: 200, generate: 200 },
      FLAGSHIP: { analyze: 500, generate: 500 },
    } as const;
    const limit = limits[fallbackPlan as keyof typeof limits] || limits.FREE;
    return NextResponse.json({
      plan: fallbackPlan,
      usage: {
        analyze: { used: 0, limit: limit.analyze, remaining: limit.analyze, cycleStart: null, cycleEnd: null },
        generate: { used: 0, limit: limit.generate, remaining: limit.generate, cycleStart: null, cycleEnd: null },
        week: { analyze: 0, generate: 0 },
      },
      _error: err?.message || "伺服器錯誤",
    });
  }
}