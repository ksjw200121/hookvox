import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 定期檢查並過期到期的訂閱
 * 可透過 Vercel Cron 或外部排程呼叫
 * 需要 CRON_SECRET 防止未授權呼叫
 *
 * Vercel cron 設定在 vercel.json:
 * { "crons": [{ "path": "/api/cron/expire-subscriptions", "schedule": "0 3 * * *" }] }
 */
export async function GET(req: Request) {
  // 驗證 cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 找到所有到期但狀態仍為 ACTIVE 的付費訂閱
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        plan: { not: "FREE" },
        endDate: { lt: now },
      },
      select: { id: true, userId: true, plan: true, endDate: true },
    });

    let expiredCount = 0;

    for (const sub of expiredSubs) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          plan: "FREE",
          status: "EXPIRED",
        },
      });
      expiredCount++;
    }

    return NextResponse.json({
      success: true,
      expiredCount,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("expire-subscriptions error:", error);
    return NextResponse.json(
      { error: "處理訂閱到期失敗" },
      { status: 500 }
    );
  }
}
