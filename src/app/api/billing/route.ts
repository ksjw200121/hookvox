import { NextResponse } from "next/server";
import {
  getBillingAccessSnapshot,
  getUserIdFromRequest,
} from "@/lib/usage-checker";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  FREE: "免費方案",
  CREATOR: "Creator 方案",
  PRO: "專業版方案",
  FLAGSHIP: "旗艦版方案",
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "月繳",
  quarterly: "季繳",
  biannual: "半年繳",
  annual: "年繳",
};

type OrderRow = {
  id: string;
  plan: string;
  billingCycle: string;
  amount: number | string | null;
  status: string;
  createdAt: Date | string;
  paidAt: Date | string | null;
  merchantTradeNo: string | null;
};

export async function GET(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);

    if (!supabaseId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const access = await getBillingAccessSnapshot(supabaseId);
    if (!access.internalUserId) {
      return NextResponse.json(
        { error: "找不到使用者資料" },
        { status: 400 }
      );
    }

    const orders = await prisma.$queryRaw<OrderRow[]>`
        SELECT
          id,
          plan,
          "billingCycle" as "billingCycle",
          amount,
          status,
          "createdAt" as "createdAt",
          "paidAt" as "paidAt",
          "merchantTradeNo" as "merchantTradeNo"
        FROM orders
        WHERE "userId" = ${access.internalUserId}
        ORDER BY "createdAt" DESC
        LIMIT 50
      `;

    return NextResponse.json({
      subscription: {
        plan: access.plan,
        planLabel: PLAN_LABELS[access.plan] || access.plan,
        billingCycle: access.billingCycle,
        status: access.status,
        startDate: access.startDate,
        endDate: access.endDate,
      },
      orders: (orders || []).map((o) => ({
        id: o.id,
        plan: o.plan,
        planLabel: PLAN_LABELS[String(o.plan).toUpperCase()] || o.plan,
        billingCycle: o.billingCycle,
        cycleLabel: CYCLE_LABELS[String(o.billingCycle)] || o.billingCycle,
        amount: Number(o.amount || 0),
        status: o.status,
        createdAt: new Date(o.createdAt).toISOString(),
        paidAt: o.paidAt ? new Date(o.paidAt).toISOString() : null,
        merchantTradeNo: o.merchantTradeNo ?? null,
      })),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("billing api error:", err);
    return NextResponse.json(
      { error: err?.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}
