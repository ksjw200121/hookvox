import { NextResponse } from "next/server";
import { getUserIdFromRequest, ensurePublicUserBySupabaseId } from "@/lib/usage-checker";
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

const PLAN_LEVEL: Record<string, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  FLAGSHIP: 3,
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

function getCycleMonths(cycle: string) {
  const c = String(cycle || "").trim();
  if (c === "monthly") return 1;
  if (c === "quarterly") return 3;
  if (c === "biannual") return 6;
  if (c === "annual") return 12;
  return 1;
}

function addMonths(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function GET(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);

    if (!supabaseId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 新註冊用戶可能尚未有 public.users 列，先同步建立
    const publicUser = await ensurePublicUserBySupabaseId(supabaseId);
    if (!publicUser?.id) {
      return NextResponse.json(
        { error: "找不到使用者資料" },
        { status: 400 }
      );
    }

    const [subscription, orders] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: publicUser.id },
        select: {
          id: true,
          plan: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      }),
      prisma.$queryRaw<OrderRow[]>`
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
        WHERE "userId" = ${publicUser.id}
        ORDER BY "createdAt" DESC
        LIMIT 50
      `,
    ]);

    let plan = "FREE";
    let status = "FREE";
    let startDate: string | null = null;
    let endDate: string | null = null;

    // 1) Prefer subscriptions table if it indicates a paid plan and is not expired
    if (subscription) {
      plan = String(subscription.plan || "FREE").trim().toUpperCase();
      status = String(subscription.status || "").trim().toUpperCase();
      startDate = subscription.startDate?.toISOString() ?? null;
      endDate = subscription.endDate?.toISOString() ?? null;
      if (endDate && new Date(endDate) <= new Date()) {
        status = "EXPIRED";
      }
    }

    const isPaidPlan =
      plan === "CREATOR" || plan === "PRO" || plan === "FLAGSHIP";
    const isExplicitlyInactive = status === "EXPIRED" || status === "CANCELLED";

    // 2) Prefer latest PAID/SUCCESS order when it is higher than subscription (upgrade case),
    // or when subscription is missing/invalid.
    const latestPaid = (orders || []).find((o) =>
      ["PAID", "SUCCESS"].includes(String(o?.status || "").toUpperCase())
    );
    const latestPaidPlan = String(latestPaid?.plan || "FREE").trim().toUpperCase();
    const isLatestPaidPlan =
      latestPaidPlan === "CREATOR" || latestPaidPlan === "PRO" || latestPaidPlan === "FLAGSHIP";

    const shouldUsePaidOrder =
      Boolean(latestPaid && isLatestPaidPlan) &&
      ((!isPaidPlan || isExplicitlyInactive) ||
        PLAN_LEVEL[latestPaidPlan] > (PLAN_LEVEL[plan] ?? 0));

    if (shouldUsePaidOrder) {
      plan = latestPaidPlan;
      status = "ACTIVE";
      const anchorIso = latestPaid?.paidAt || latestPaid?.createdAt || null;
      const cycle = String(latestPaid?.billingCycle || "monthly");
      const months = getCycleMonths(cycle);
      if (anchorIso) {
        const anchor = new Date(anchorIso);
        if (!Number.isNaN(anchor.getTime())) {
          startDate = anchor.toISOString();
          endDate = addMonths(anchor, months).toISOString();
        }
      }

      // best-effort: self-heal subscription row to avoid future mismatches
      const nowIso = new Date();
      await prisma.subscription.upsert({
        where: { userId: publicUser.id },
        update: {
          plan: plan as any,
          status: "ACTIVE" as any,
          startDate: startDate ? new Date(startDate) : nowIso,
          endDate: endDate ? new Date(endDate) : null,
          updatedAt: nowIso,
        },
        create: {
          userId: publicUser.id,
          plan: plan as any,
          status: "ACTIVE" as any,
          startDate: startDate ? new Date(startDate) : nowIso,
          endDate: endDate ? new Date(endDate) : null,
        },
      });
    }

    return NextResponse.json({
      subscription: {
        plan,
        planLabel: PLAN_LABELS[plan] || plan,
        status,
        startDate,
        endDate,
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
