import { prisma } from "@/lib/prisma";
import {
  getBillingAccessSnapshot,
  getUsageSnapshotForSupabaseId,
  type PlanName,
} from "@/lib/usage-checker";

const PLAN_LEVEL: Record<PlanName, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  FLAGSHIP: 3,
};

type BillingCycle = "monthly" | "quarterly" | "biannual" | "annual";

function normalizePlan(plan?: string | null): PlanName {
  const normalized = String(plan || "FREE").trim().toUpperCase();
  if (normalized === "CREATOR" || normalized === "PRO" || normalized === "FLAGSHIP") {
    return normalized;
  }
  return "FREE";
}

function normalizeStatus(status?: string | null) {
  return String(status || "FREE").trim().toUpperCase() || "FREE";
}

function getCycleMonths(cycle?: string | null) {
  if (cycle === "quarterly") return 3;
  if (cycle === "biannual") return 6;
  if (cycle === "annual") return 12;
  return 1;
}

function inferBillingCycle(startDate?: Date | null, endDate?: Date | null): BillingCycle | null {
  if (!startDate || !endDate) {
    return null;
  }

  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  if (months === 3) return "quarterly";
  if (months === 6) return "biannual";
  if (months === 12) return "annual";
  return "monthly";
}

function resolveEffectivePlan(input: {
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
  latestOrderPlan?: string | null;
  latestOrderStatus?: string | null;
  latestOrderBillingCycle?: string | null;
  latestOrderPaidAt?: Date | null;
  latestOrderCreatedAt?: Date | null;
}) {
  const now = new Date();
  const subscriptionPlan = normalizePlan(input.subscriptionPlan);
  const subscriptionStatus = normalizeStatus(input.subscriptionStatus);
  const subscriptionEndValid =
    input.subscriptionEndDate &&
    !Number.isNaN(input.subscriptionEndDate.getTime()) &&
    input.subscriptionEndDate > now;
  const subscriptionActive =
    subscriptionPlan !== "FREE" &&
    subscriptionStatus === "ACTIVE" &&
    Boolean(subscriptionEndValid);

  let plan: PlanName = subscriptionActive ? subscriptionPlan : "FREE";
  let status = subscriptionActive ? "ACTIVE" : subscriptionStatus;
  let billingCycle = subscriptionActive
    ? inferBillingCycle(input.subscriptionStartDate, input.subscriptionEndDate)
    : null;

  const latestOrderPlan = normalizePlan(input.latestOrderPlan);
  const latestOrderStatus = normalizeStatus(input.latestOrderStatus);
  const latestOrderAnchor = input.latestOrderPaidAt || input.latestOrderCreatedAt || null;

  if (
    latestOrderPlan !== "FREE" &&
    (latestOrderStatus === "PAID" || latestOrderStatus === "SUCCESS") &&
    latestOrderAnchor
  ) {
    const latestOrderEnd = new Date(latestOrderAnchor);
    latestOrderEnd.setMonth(
      latestOrderEnd.getMonth() + getCycleMonths(input.latestOrderBillingCycle)
    );

    if (latestOrderEnd > now && PLAN_LEVEL[latestOrderPlan] >= PLAN_LEVEL[plan]) {
      plan = latestOrderPlan;
      status = "ACTIVE";
      billingCycle = (String(input.latestOrderBillingCycle || "monthly") as BillingCycle) || "monthly";
    }
  }

  return {
    plan,
    status,
    billingCycle,
  };
}

function toNumber(value: unknown) {
  if (value == null) return 0;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export async function resolveAdminTargetUser(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      name: true,
      avatarUrl: true,
      instagramHandle: true,
      accountStatus: true,
      internalNoteSummary: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          startDate: true,
          endDate: true,
          ecpayTradeNo: true,
          ecpayMerchantTradeNo: true,
          newebpayTradeNo: true,
          newebpayMerchantOrderNo: true,
        },
      },
    },
  });
}

export async function getAdminUsersList(input: {
  q?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  accountStatus?: string | null;
  role?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  limit?: number;
}) {
  const q = String(input.q || "").trim();
  const createdFrom = input.createdFrom ? new Date(input.createdFrom) : null;
  const createdTo = input.createdTo ? new Date(input.createdTo) : null;
  const limit = Math.min(Math.max(Number(input.limit || 100), 1), 200);

  const users = await prisma.user.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
                { supabaseId: { contains: q, mode: "insensitive" } },
                { instagramHandle: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        input.accountStatus
          ? { accountStatus: String(input.accountStatus).toUpperCase() as any }
          : {},
        input.role
          ? {
              role: String(input.role).toUpperCase() === "ADMIN"
                ? "ADMIN"
                : String(input.role).toUpperCase(),
            }
          : {},
        createdFrom && !Number.isNaN(createdFrom.getTime())
          ? { createdAt: { gte: createdFrom } }
          : {},
        createdTo && !Number.isNaN(createdTo.getTime())
          ? { createdAt: { lte: createdTo } }
          : {},
      ],
    },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      name: true,
      instagramHandle: true,
      accountStatus: true,
      role: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const internalUserIds = users.map((user) => user.id);
  const supabaseIds = users.map((user) => user.supabaseId);

  const [orders, usageGroups] = await Promise.all([
    internalUserIds.length
      ? prisma.order.findMany({
          where: {
            userId: { in: internalUserIds },
          },
          select: {
            id: true,
            userId: true,
            plan: true,
            billingCycle: true,
            amount: true,
            status: true,
            paidAt: true,
            createdAt: true,
            merchantTradeNo: true,
            tradeNo: true,
          },
          orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    supabaseIds.length
      ? prisma.usageLog.groupBy({
          by: ["userId"],
          where: {
            userId: { in: supabaseIds },
          },
          _max: {
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const latestOrderByUserId = new Map<string, (typeof orders)[number]>();
  for (const order of orders) {
    if (!latestOrderByUserId.has(order.userId)) {
      latestOrderByUserId.set(order.userId, order);
    }
  }

  const lastUsageBySupabaseId = new Map<string, Date | null>();
  for (const row of usageGroups) {
    lastUsageBySupabaseId.set(row.userId, row._max.createdAt || null);
  }

  const items = users
    .map((user) => {
      const latestOrder = latestOrderByUserId.get(user.id);
      const effective = resolveEffectivePlan({
        subscriptionPlan: user.subscription?.plan,
        subscriptionStatus: user.subscription?.status,
        subscriptionStartDate: user.subscription?.startDate,
        subscriptionEndDate: user.subscription?.endDate,
        latestOrderPlan: latestOrder?.plan,
        latestOrderStatus: latestOrder?.status,
        latestOrderBillingCycle: latestOrder?.billingCycle,
        latestOrderPaidAt: latestOrder?.paidAt,
        latestOrderCreatedAt: latestOrder?.createdAt,
      });

      return {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        instagramHandle: user.instagramHandle,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        plan: effective.plan,
        subscriptionStatus: effective.status,
        billingCycle: effective.billingCycle,
        lastPaymentAt: latestOrder?.paidAt || latestOrder?.createdAt || null,
        lastPaymentStatus: latestOrder?.status || null,
        lastPaymentAmount: toNumber(latestOrder?.amount),
        lastUsageAt: lastUsageBySupabaseId.get(user.supabaseId) || null,
      };
    })
    .filter((item) => {
      if (input.plan && item.plan !== String(input.plan).toUpperCase()) {
        return false;
      }
      if (
        input.subscriptionStatus &&
        item.subscriptionStatus !== String(input.subscriptionStatus).toUpperCase()
      ) {
        return false;
      }
      return true;
    });

  return {
    items,
    total: items.length,
  };
}

export async function getAdminUserSummary(supabaseId: string) {
  const user = await resolveAdminTargetUser(supabaseId);
  if (!user) {
    return null;
  }

  const [billing, usage, orders, recentContent, recentAdjustments] = await Promise.all([
    getBillingAccessSnapshot(user.supabaseId),
    getUsageSnapshotForSupabaseId(user.supabaseId),
    prisma.order.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        plan: true,
        billingCycle: true,
        amount: true,
        status: true,
        merchantTradeNo: true,
        tradeNo: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.viralDatabase.findMany({
      where: {
        OR: [{ publicUserId: user.id }, { userId: user.supabaseId }],
      },
      select: {
        id: true,
        videoUrl: true,
        transcript: true,
        analysis: true,
        createdAt: true,
        isSaved: true,
        savedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.manualQuotaAdjustment.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        feature: true,
        delta: true,
        reason: true,
        effectiveFrom: true,
        effectiveTo: true,
        revokedAt: true,
        createdAt: true,
        actorUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const last7DaysUsage = await prisma.usageLog.groupBy({
    by: ["action"],
    where: {
      userId: user.supabaseId,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    _count: {
      action: true,
    },
  });

  return {
    user: {
      ...user,
      accountStatus: String(user.accountStatus || "ACTIVE"),
    },
    billing,
    usage,
    orders: orders.map((order) => ({
      ...order,
      amount: toNumber(order.amount),
    })),
    content: recentContent,
    recentUsage: last7DaysUsage.map((row) => ({
      action: row.action,
      count: row._count.action,
    })),
    adjustments: recentAdjustments,
  };
}
