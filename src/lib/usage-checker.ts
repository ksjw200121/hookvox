import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export type PlanName = "FREE" | "CREATOR" | "PRO" | "FLAGSHIP";
export type UsageFeature = "ANALYZE" | "GENERATE";
export type UsageAction =
  | "ANALYZE"
  | "GENERATE_SCRIPT"
  | "GENERATE_TITLES"
  | "GENERATE_IDEAS";

const PLAN_LEVEL: Record<PlanName, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  FLAGSHIP: 3,
};

const LIMITS: Record<PlanName, Record<UsageFeature, number>> = {
  FREE: {
    ANALYZE: 3,
    GENERATE: 3,
  },
  CREATOR: {
    ANALYZE: 50,
    GENERATE: 50,
  },
  PRO: {
    ANALYZE: 200,
    GENERATE: 200,
  },
  FLAGSHIP: {
    ANALYZE: 500,
    GENERATE: 500,
  },
};

type UserRow = {
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  supabaseId: string;
  instagramHandle?: string | null;
  accountStatus?: string | null;
  internalNoteSummary?: string | null;
  role?: string | null;
  createdAt?: Date | null;
};

type SubscriptionRow = {
  id: string;
  userId: string;
  plan: PlanName;
  status: string;
  ecpayTradeNo?: string | null;
  ecpayMerchantTradeNo?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

type PaidOrderRow = {
  plan: string | null;
  status: string | null;
  billingCycle?: string | null;
  paidAt: Date | string | null;
  createdAt: Date | string | null;
  tradeNo?: string | null;
  merchantTradeNo?: string | null;
};

type ActivePaidOrder = {
  plan: PlanName;
  billingCycle: string;
  startDate: string;
  endDate: string;
  tradeNo: string | null;
  merchantTradeNo: string | null;
};

type EffectiveAccessContext = {
  supabaseId: string;
  publicUser: UserRow | null;
  internalUserId: string | null;
  plan: PlanName;
  accountStatus: string;
  subscription: SubscriptionRow | null;
  status: string;
  billingCycle: string | null;
  cycleMonths: number;
  cycleAnchor: string | null;
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function getBillingCycleMonths(billingCycle?: string | null) {
  if (billingCycle === "quarterly") return 3;
  if (billingCycle === "biannual") return 6;
  if (billingCycle === "annual") return 12;
  return 1;
}

function getCurrentCycleWindow(anchorInput?: string | null, cycleMonths = 1): {
  cycleStart: string;
  cycleEnd: string;
} {
  const now = new Date();
  let cycleStart = anchorInput ? new Date(anchorInput) : new Date();

  if (Number.isNaN(cycleStart.getTime())) {
    cycleStart = new Date();
  }

  const safeCycleMonths = cycleMonths > 0 ? cycleMonths : 1;
  let cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + safeCycleMonths);

  while (now >= cycleEnd) {
    cycleStart = cycleEnd;
    cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + safeCycleMonths);
  }

  return {
    cycleStart: cycleStart.toISOString(),
    cycleEnd: cycleEnd.toISOString(),
  };
}

function normalizePlanName(input?: string | null): PlanName {
  const plan = String(input || "FREE").trim().toUpperCase();
  if (plan === "CREATOR" || plan === "PRO" || plan === "FLAGSHIP") {
    return plan;
  }
  return "FREE";
}

function isPaidPlanName(plan: PlanName) {
  return plan === "CREATOR" || plan === "PRO" || plan === "FLAGSHIP";
}

function inferCycleMonthsFromSubscription(subscription: SubscriptionRow | null) {
  if (!subscription?.startDate || !subscription?.endDate) {
    return 1;
  }

  const start = new Date(subscription.startDate);
  const end = new Date(subscription.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (months === 3 || months === 6 || months === 12) {
    return months;
  }

  return 1;
}

function getBillingCycleFromMonths(months: number): string {
  if (months === 3) return "quarterly";
  if (months === 6) return "biannual";
  if (months === 12) return "annual";
  return "monthly";
}

async function getQuotaAdjustmentTotal(
  publicUserId: string | null,
  feature: UsageFeature,
  cycleStart: string,
  cycleEnd: string
) {
  if (!publicUserId) {
    return 0;
  }

  const aggregate = await prisma.manualQuotaAdjustment.aggregate({
    where: {
      userId: publicUserId,
      feature: feature as any,
      revokedAt: null,
      effectiveFrom: {
        lt: new Date(cycleEnd),
      },
      OR: [
        { effectiveTo: null },
        {
          effectiveTo: {
            gte: new Date(cycleStart),
          },
        },
      ],
    },
    _sum: {
      delta: true,
    },
  });

  return Number(aggregate._sum.delta || 0);
}

function getActivePaidOrderFromRow(order: PaidOrderRow | null): ActivePaidOrder | null {
  if (!order) {
    return null;
  }

  const plan = normalizePlanName(order.plan);
  if (!isPaidPlanName(plan)) {
    return null;
  }

  const anchorInput = order.paidAt || order.createdAt;
  if (!anchorInput) {
    return null;
  }

  const startDate = new Date(anchorInput);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + getBillingCycleMonths(order.billingCycle));

  if (endDate <= new Date()) {
    return null;
  }

  return {
    plan,
    billingCycle: String(order.billingCycle || "monthly"),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    tradeNo: order.tradeNo ? String(order.tradeNo) : null,
    merchantTradeNo: order.merchantTradeNo ? String(order.merchantTradeNo) : null,
  };
}

export async function getUserIdFromRequest(
  req: Request
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return null;
  }

  return data.user.id;
}

async function getAuthUserFromSupabaseId(supabaseId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(supabaseId);

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export async function ensurePublicUserBySupabaseId(
  supabaseId: string
): Promise<UserRow | null> {
  const existingUser = await prisma.user.findUnique({
    where: { supabaseId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      supabaseId: true,
      instagramHandle: true,
      accountStatus: true,
      internalNoteSummary: true,
      role: true,
      createdAt: true,
    },
  });
  if (existingUser) {
    return existingUser as UserRow;
  }

  const authUser = await getAuthUserFromSupabaseId(supabaseId);

  if (!authUser) {
    return null;
  }

  const fallbackEmail = authUser.email || "";
  const fallbackName =
    (authUser.user_metadata?.name as string | undefined) ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    null;
  const fallbackAvatar =
    (authUser.user_metadata?.avatar_url as string | undefined) ||
    (authUser.user_metadata?.picture as string | undefined) ||
    null;

  try {
    const insertedUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: fallbackEmail,
        name: fallbackName,
        avatarUrl: fallbackAvatar,
        supabaseId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        supabaseId: true,
        instagramHandle: true,
        accountStatus: true,
        internalNoteSummary: true,
        role: true,
        createdAt: true,
      },
    });
    return insertedUser as UserRow;
  } catch (error) {
    // 同 email 已存在（例如重辦帳號）：改為綁定該列到目前登入的 auth
    if (fallbackEmail) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: fallbackEmail },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          supabaseId: true,
          instagramHandle: true,
          accountStatus: true,
          internalNoteSummary: true,
          role: true,
          createdAt: true,
        },
      });
      if (existingByEmail) {
        const updated = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { supabaseId },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            supabaseId: true,
            instagramHandle: true,
            accountStatus: true,
            internalNoteSummary: true,
            role: true,
            createdAt: true,
          },
        });
        return updated as UserRow;
      }
    }
    const message = error instanceof Error ? error.message : "unknown";
    throw new Error(`Failed to create user: ${message}`);
  }
}

async function ensureSubscriptionByInternalUserId(
  internalUserId: string
): Promise<SubscriptionRow> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existingSubscription, error: selectError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, userId, plan, status, ecpayTradeNo, ecpayMerchantTradeNo, startDate, endDate")
    .eq("userId", internalUserId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to load subscription: ${selectError.message}`);
  }

  if (existingSubscription) {
    return existingSubscription as SubscriptionRow;
  }

  const now = new Date().toISOString();

  const { data: insertedSubscription, error: insertError } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      id: crypto.randomUUID(),
      userId: internalUserId,
      plan: "FREE",
      status: "ACTIVE",
      startDate: now,
      createdAt: now,
      updatedAt: now,
    })
    .select("id, userId, plan, status, ecpayTradeNo, ecpayMerchantTradeNo, startDate, endDate")
    .single();

  if (insertError) {
    const isDuplicateUserId =
      insertError.code === "23505" ||
      String(insertError.message || "").includes("subscriptions_userId_key");
    if (isDuplicateUserId) {
      const { data: row, error: retryErr } = await supabaseAdmin
        .from("subscriptions")
        .select("id, userId, plan, status, ecpayTradeNo, ecpayMerchantTradeNo, startDate, endDate")
        .eq("userId", internalUserId)
        .maybeSingle();
      if (!retryErr && row) return row as SubscriptionRow;
      // 已有列但 SELECT 未命中（例如欄位型別差異）：回傳預設 FREE，避免整支 API 拋錯
      return {
        id: "",
        userId: internalUserId,
        plan: "FREE",
        status: "ACTIVE",
        startDate: now,
        endDate: null,
      } as SubscriptionRow;
    }
    throw new Error(`Failed to create subscription: ${insertError.message}`);
  }

  return insertedSubscription as SubscriptionRow;
}

/** 僅讀取訂閱不 INSERT，與 billing 一致，避免 usage 與帳單方案不同步 */
async function getSubscriptionReadOnly(
  internalUserId: string
): Promise<SubscriptionRow | null> {
  const data = await prisma.subscription.findUnique({
    where: { userId: internalUserId },
    select: {
      id: true,
      userId: true,
      plan: true,
      status: true,
      ecpayTradeNo: true,
      ecpayMerchantTradeNo: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!data) return null;
  return {
    id: data.id,
    userId: data.userId,
    plan: String(data.plan).toUpperCase() as PlanName,
    status: String(data.status).toUpperCase(),
    ecpayTradeNo: data.ecpayTradeNo ?? null,
    ecpayMerchantTradeNo: data.ecpayMerchantTradeNo ?? null,
    startDate: data.startDate?.toISOString() ?? null,
    endDate: data.endDate?.toISOString() ?? null,
  };
}

async function getLatestPaidOrderByInternalUserId(
  internalUserId: string
): Promise<PaidOrderRow | null> {
  const rows = await prisma.$queryRaw<PaidOrderRow[]>`
    SELECT
      plan,
      status,
      "billingCycle" as "billingCycle",
      "paidAt" as "paidAt",
      "createdAt" as "createdAt",
      "tradeNo" as "tradeNo",
      "merchantTradeNo" as "merchantTradeNo"
    FROM orders
    WHERE "userId" = ${internalUserId}
      AND status IN ('PAID', 'SUCCESS')
    ORDER BY "paidAt" DESC NULLS LAST, "createdAt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function syncSubscriptionFromPaidOrder(
  internalUserId: string,
  activePaidOrder: ActivePaidOrder
): Promise<SubscriptionRow | null> {
  const now = new Date();
  const synced = await prisma.subscription.upsert({
    where: { userId: internalUserId },
    update: {
      plan: activePaidOrder.plan as any,
      status: "ACTIVE" as any,
      startDate: new Date(activePaidOrder.startDate),
      endDate: new Date(activePaidOrder.endDate),
      ecpayTradeNo: activePaidOrder.tradeNo,
      ecpayMerchantTradeNo: activePaidOrder.merchantTradeNo,
      updatedAt: now,
    },
    create: {
      userId: internalUserId,
      plan: activePaidOrder.plan as any,
      status: "ACTIVE" as any,
      startDate: new Date(activePaidOrder.startDate),
      endDate: new Date(activePaidOrder.endDate),
      ecpayTradeNo: activePaidOrder.tradeNo,
      ecpayMerchantTradeNo: activePaidOrder.merchantTradeNo,
    },
    select: {
      id: true,
      userId: true,
      plan: true,
      status: true,
      ecpayTradeNo: true,
      ecpayMerchantTradeNo: true,
      startDate: true,
      endDate: true,
    },
  });

  return {
    id: synced.id,
    userId: synced.userId,
    plan: String(synced.plan).toUpperCase() as PlanName,
    status: String(synced.status).toUpperCase(),
    ecpayTradeNo: synced.ecpayTradeNo ?? null,
    ecpayMerchantTradeNo: synced.ecpayMerchantTradeNo ?? null,
    startDate: synced.startDate?.toISOString() ?? null,
    endDate: synced.endDate?.toISOString() ?? null,
  };
}

async function normalizeSubscriptionState(
  subscription: SubscriptionRow
): Promise<SubscriptionRow> {
  if (!subscription?.endDate) {
    return subscription;
  }

  const endDate = new Date(subscription.endDate);
  if (Number.isNaN(endDate.getTime())) {
    return subscription;
  }

  const now = new Date();
  if (now < endDate) {
    return subscription;
  }

  if (subscription.plan === "FREE" && subscription.status === "EXPIRED") {
    return subscription;
  }

  const updateTime = now;
  try {
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: "FREE" as any,
        status: "EXPIRED" as any,
        updatedAt: updateTime,
      },
      select: {
        id: true,
        userId: true,
        plan: true,
        status: true,
        ecpayTradeNo: true,
        ecpayMerchantTradeNo: true,
        startDate: true,
        endDate: true,
      },
    });
    return {
      id: updatedSubscription.id,
      userId: updatedSubscription.userId,
      plan: String(updatedSubscription.plan).toUpperCase() as PlanName,
      status: String(updatedSubscription.status).toUpperCase(),
      ecpayTradeNo: updatedSubscription.ecpayTradeNo ?? null,
      ecpayMerchantTradeNo: updatedSubscription.ecpayMerchantTradeNo ?? null,
      startDate: updatedSubscription.startDate?.toISOString() ?? null,
      endDate: updatedSubscription.endDate?.toISOString() ?? null,
    };
  } catch {
    return subscription;
  }
}

function getPlanFromSubscription(subscription: SubscriptionRow | null): PlanName {
  if (!subscription) {
    return "FREE";
  }

  const statusNormalized = String(subscription.status || "").trim().toUpperCase();
  const planNormalized = normalizePlanName(subscription.plan);
  const isExplicitlyInactive =
    statusNormalized === "EXPIRED" || statusNormalized === "CANCELLED";
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const isExpired =
    endDate && !Number.isNaN(endDate.getTime()) && endDate <= new Date();

  if (isPaidPlanName(planNormalized) && !isExplicitlyInactive && !isExpired) {
    return planNormalized;
  }

  return "FREE";
}

async function getEffectiveAccessContext(
  supabaseId: string
): Promise<EffectiveAccessContext> {
  const publicUser = await ensurePublicUserBySupabaseId(supabaseId);

  if (!publicUser?.id) {
    return {
      supabaseId,
      publicUser: null,
      internalUserId: null,
      plan: "FREE",
      accountStatus: "ACTIVE",
      subscription: null,
      status: "FREE",
      billingCycle: null,
      cycleMonths: 1,
      cycleAnchor: null,
    };
  }

  let subscription = await getSubscriptionReadOnly(publicUser.id);
  if (subscription) {
    subscription = await normalizeSubscriptionState(subscription);
  }

  const latestPaidOrder = await getLatestPaidOrderByInternalUserId(publicUser.id);
  const activePaidOrder = getActivePaidOrderFromRow(latestPaidOrder);
  const subscriptionPlan = getPlanFromSubscription(subscription);

  if (
    activePaidOrder &&
    (!subscription ||
      PLAN_LEVEL[activePaidOrder.plan] >= PLAN_LEVEL[subscriptionPlan] ||
      subscriptionPlan === "FREE")
  ) {
    subscription = await syncSubscriptionFromPaidOrder(publicUser.id, activePaidOrder);
  }

  const effectivePlan = activePaidOrder
    ? PLAN_LEVEL[activePaidOrder.plan] > PLAN_LEVEL[getPlanFromSubscription(subscription)]
      ? activePaidOrder.plan
      : getPlanFromSubscription(subscription)
    : getPlanFromSubscription(subscription);

  const cycleMonths = activePaidOrder
    ? getBillingCycleMonths(activePaidOrder.billingCycle)
    : inferCycleMonthsFromSubscription(subscription);
  const billingCycle =
    activePaidOrder?.billingCycle ||
    (effectivePlan !== "FREE" ? getBillingCycleFromMonths(cycleMonths) : null);
  const cycleAnchor =
    subscription?.startDate ??
    activePaidOrder?.startDate ??
    publicUser.createdAt?.toISOString() ??
    null;
  const status =
    effectivePlan === "FREE"
      ? String(subscription?.status || "FREE").trim().toUpperCase() || "FREE"
      : "ACTIVE";
  const accountStatus = String(publicUser.accountStatus || "ACTIVE")
    .trim()
    .toUpperCase();

  return {
    supabaseId,
    publicUser,
    internalUserId: publicUser.id,
    plan: effectivePlan,
    accountStatus,
    subscription,
    status,
    billingCycle,
    cycleMonths,
    cycleAnchor,
  };
}

async function getUserContext(supabaseId: string): Promise<{
  supabaseId: string;
  internalUserId: string | null;
  plan: PlanName;
  subscription: SubscriptionRow | null;
}> {
  const context = await getEffectiveAccessContext(supabaseId);
  return {
    supabaseId: context.supabaseId,
    internalUserId: context.internalUserId,
    plan: context.plan,
    subscription: context.subscription,
  };
}

export async function getUserPlan(supabaseId: string): Promise<PlanName> {
  const context = await getUserContext(supabaseId);
  return context.plan;
}

export async function getBillingAccessSnapshot(supabaseId: string): Promise<{
  internalUserId: string | null;
  plan: PlanName;
  accountStatus: string;
  status: string;
  billingCycle: string | null;
  startDate: string | null;
  endDate: string | null;
}> {
  const context = await getEffectiveAccessContext(supabaseId);
  return {
    internalUserId: context.internalUserId,
    plan: context.plan,
    accountStatus: context.accountStatus,
    status: context.status,
    billingCycle: context.billingCycle,
    startDate: context.subscription?.startDate ?? context.cycleAnchor,
    endDate: context.subscription?.endDate ?? null,
  };
}

/** 僅讀取訂閱方案，不建立 subscription、不拋錯，用於 usage API 錯誤時仍回傳與帳單一致的方案 */
export async function getPlanForSupabaseIdSafe(supabaseId: string): Promise<PlanName> {
  try {
    const context = await getEffectiveAccessContext(supabaseId);
    return context.plan;
  } catch {
    return "FREE";
  }
}

export function getActionGroup(action: string): UsageFeature | null {
  if (action === "ANALYZE") return "ANALYZE";

  if (
    action === "GENERATE" ||
    action === "GENERATE_SCRIPT" ||
    action === "GENERATE_TITLES" ||
    action === "GENERATE_IDEAS"
  ) {
    return "GENERATE";
  }

  return null;
}

export type UsageSnapshot = {
  plan: PlanName;
  accountStatus?: string;
  usage: {
    analyze: {
      used: number;
      limit: number;
      remaining: number;
      cycleStart: string | null;
      cycleEnd: string | null;
      adjustment: number;
    };
    generate: {
      used: number;
      limit: number;
      remaining: number;
      cycleStart: string | null;
      cycleEnd: string | null;
      adjustment: number;
    };
    week: { analyze: number; generate: number };
  };
};

/**
 * 單一來源的方案/額度快照（與 billing 同源的 subscriptions）。
 * 用於 /api/usage，避免不同頁面顯示的方案不一致。
 */
export async function getUsageSnapshotForSupabaseId(
  supabaseId: string
): Promise<UsageSnapshot> {
  const context = await getEffectiveAccessContext(supabaseId);
  const plan = context.plan;
  const { cycleStart, cycleEnd } = getCurrentCycleWindow(
    context.cycleAnchor,
    context.cycleMonths
  );

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartIso = weekStart.toISOString();

  const [cycleLogs, weekLogs] = await Promise.all([
    prisma.usageLog.findMany({
      where: {
        userId: supabaseId,
        createdAt: {
          gte: new Date(cycleStart),
          lt: new Date(cycleEnd),
        },
      },
      select: { action: true, createdAt: true },
    }),
    prisma.usageLog.findMany({
      where: {
        userId: supabaseId,
        createdAt: {
          gte: new Date(weekStartIso),
        },
      },
      select: { action: true, createdAt: true },
    }),
  ]);

  const usedAnalyze =
    (cycleLogs || []).filter((row: any) => getActionGroup(row.action) === "ANALYZE")
      .length || 0;
  const usedGenerate =
    (cycleLogs || []).filter((row: any) => getActionGroup(row.action) === "GENERATE")
      .length || 0;
  const [analyzeAdjustment, generateAdjustment] = await Promise.all([
    getQuotaAdjustmentTotal(context.internalUserId, "ANALYZE", cycleStart, cycleEnd),
    getQuotaAdjustmentTotal(context.internalUserId, "GENERATE", cycleStart, cycleEnd),
  ]);

  let weekAnalyze = 0;
  let weekGenerate = 0;
  for (const row of weekLogs || []) {
    const group = getActionGroup((row as any).action);
    if (group === "ANALYZE") weekAnalyze += 1;
    if (group === "GENERATE") weekGenerate += 1;
  }

  const analyzeLimit = Math.max(LIMITS[plan].ANALYZE + analyzeAdjustment, 0);
  const generateLimit = Math.max(LIMITS[plan].GENERATE + generateAdjustment, 0);

  return {
    plan,
    accountStatus: context.accountStatus,
    usage: {
      analyze: {
        used: usedAnalyze,
        limit: analyzeLimit,
        remaining: Math.max(analyzeLimit - usedAnalyze, 0),
        cycleStart,
        cycleEnd,
        adjustment: analyzeAdjustment,
      },
      generate: {
        used: usedGenerate,
        limit: generateLimit,
        remaining: Math.max(generateLimit - usedGenerate, 0),
        cycleStart,
        cycleEnd,
        adjustment: generateAdjustment,
      },
      week: { analyze: weekAnalyze, generate: weekGenerate },
    },
  };
}

export async function checkUsageLimit(
  supabaseId: string,
  feature: UsageFeature
): Promise<
  | {
      allowed: true;
      plan: PlanName;
      feature: UsageFeature;
      used: number;
      limit: number;
      remaining: number;
      publicUserId: string;
      cycleStart: string;
      cycleEnd: string;
    }
  | {
      allowed: false;
      message: string;
      plan: PlanName;
      feature: UsageFeature;
      used: number;
      limit: number;
      remaining: number;
      cycleStart: string;
      cycleEnd: string;
    }
> {
  const context = await getEffectiveAccessContext(supabaseId);
  const plan = context.plan;

  const { cycleStart, cycleEnd } = getCurrentCycleWindow(
    context.cycleAnchor,
    context.cycleMonths
  );
  const adjustment = await getQuotaAdjustmentTotal(
    context.internalUserId,
    feature,
    cycleStart,
    cycleEnd
  );
  const limit = Math.max(LIMITS[plan][feature] + adjustment, 0);

  const data = await prisma.usageLog.findMany({
    where: {
      userId: supabaseId,
      createdAt: {
        gte: new Date(cycleStart),
        lt: new Date(cycleEnd),
      },
    },
    select: { action: true, createdAt: true },
  });

  const used =
    (data || []).filter((row) => getActionGroup(row.action) === feature)
      .length || 0;

  const remaining = Math.max(limit - used, 0);

  if (context.accountStatus === "SUSPENDED") {
    return {
      allowed: false,
      message: "ACCOUNT_SUSPENDED",
      plan,
      feature,
      used,
      limit,
      remaining,
      cycleStart,
      cycleEnd,
    };
  }

  if (used >= limit) {
    return {
      allowed: false,
      message: `${feature}_LIMIT_REACHED`,
      plan,
      feature,
      used,
      limit,
      remaining: 0,
      cycleStart,
      cycleEnd,
    };
  }

  return {
    allowed: true,
    plan,
    feature,
    used,
    limit,
    remaining,
    publicUserId: supabaseId,
    cycleStart,
    cycleEnd,
  };
}

/** 過去 7 天內的分析/生成次數（本週使用小卡用，不增加 AI 成本） */
export async function getWeekUsage(supabaseId: string): Promise<{
  analyze: number;
  generate: number;
}> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const startIso = weekStart.toISOString();

  const data = await prisma.usageLog.findMany({
    where: {
      userId: supabaseId,
      createdAt: {
        gte: new Date(startIso),
      },
    },
    select: { action: true },
  });

  let analyze = 0;
  let generate = 0;
  for (const row of data || []) {
    const group = getActionGroup(row.action);
    if (group === "ANALYZE") analyze += 1;
    if (group === "GENERATE") generate += 1;
  }
  return { analyze, generate };
}

export async function logUsage(
  userId: string,
  action: UsageAction
): Promise<void> {
  const now = new Date();
  const publicUser = await ensurePublicUserBySupabaseId(userId);
  await prisma.usageLog.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      publicUserId: publicUser?.id || null,
      action: action as any,
      date: now,
      createdAt: now,
    },
  });
}