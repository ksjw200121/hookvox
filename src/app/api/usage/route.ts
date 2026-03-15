import { NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  checkUsageLimit,
  getWeekUsage,
} from "@/lib/usage-checker";

export const runtime = "nodejs";

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

    return NextResponse.json(
      { error: err?.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}