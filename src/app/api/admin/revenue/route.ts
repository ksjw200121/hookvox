import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const adminResult = await assertAdmin(req);

    if (!adminResult.ok) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Monthly revenue & order count
    const monthlyOrders = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "SUCCESS"] },
        paidAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      select: {
        id: true,
        plan: true,
        amount: true,
        billingCycle: true,
        paidAt: true,
      },
    });

    const monthlyRevenue = monthlyOrders.reduce(
      (sum, o) => sum + Number(o.amount || 0),
      0
    );

    // Plan distribution (count of paid users per plan)
    const planCounts: Record<string, number> = {};
    for (const o of monthlyOrders) {
      const plan = String(o.plan || "UNKNOWN").toUpperCase();
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }

    // Recent 10 payments
    const recentPayments = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "SUCCESS"] },
      },
      orderBy: { paidAt: "desc" },
      take: 10,
      select: {
        id: true,
        plan: true,
        billingCycle: true,
        amount: true,
        paidAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      monthlyRevenue,
      monthlyOrderCount: monthlyOrders.length,
      planCounts,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        plan: p.plan,
        billingCycle: p.billingCycle,
        amount: Number(p.amount || 0),
        paidAt: p.paidAt?.toISOString() || null,
        email: p.user?.email || null,
        name: p.user?.name || null,
      })),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin revenue error:", err);
    return NextResponse.json(
      { error: "讀取收入資料失敗" },
      { status: 500 }
    );
  }
}
