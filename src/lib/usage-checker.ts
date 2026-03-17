import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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

function getCurrentCycleWindow(anchorInput?: string | null): {
  cycleStart: string;
  cycleEnd: string;
} {
  const now = new Date();
  let cycleStart = anchorInput ? new Date(anchorInput) : new Date();

  if (Number.isNaN(cycleStart.getTime())) {
    cycleStart = new Date();
  }

  let cycleEnd = addOneMonth(cycleStart);

  while (now >= cycleEnd) {
    cycleStart = cycleEnd;
    cycleEnd = addOneMonth(cycleStart);
  }

  return {
    cycleStart: cycleStart.toISOString(),
    cycleEnd: cycleEnd.toISOString(),
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
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existingUser, error: selectError } = await supabaseAdmin
    .from("users")
    .select("id, email, name, avatarUrl, supabaseId")
    .eq("supabaseId", supabaseId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to load user: ${selectError.message}`);
  }

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

  const nowIso = new Date().toISOString();
  const { data: insertedUser, error: insertError } = await supabaseAdmin
    .from("users")
    .insert({
      id: crypto.randomUUID(),
      email: fallbackEmail,
      name: fallbackName,
      avatarUrl: fallbackAvatar,
      supabaseId,
      updatedAt: nowIso,
    })
    .select("id, email, name, avatarUrl, supabaseId")
    .single();

  if (insertError) {
    // 同 email 已存在（例如重辦帳號）：改為綁定該列到目前登入的 auth
    const isDuplicateEmail =
      insertError.code === "23505" ||
      String(insertError.message || "").includes("users_email_key");
    if (isDuplicateEmail && fallbackEmail) {
      const { data: existingByEmail, error: fetchErr } = await supabaseAdmin
        .from("users")
        .select("id, email, name, avatarUrl, supabaseId")
        .eq("email", fallbackEmail)
        .maybeSingle();
      if (!fetchErr && existingByEmail) {
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from("users")
          .update({ supabaseId, updatedAt: nowIso })
          .eq("id", existingByEmail.id)
          .select("id, email, name, avatarUrl, supabaseId")
          .single();
        if (!updateErr && updated) return updated as UserRow;
      }
    }
    throw new Error(`Failed to create user: ${insertError.message}`);
  }

  return insertedUser as UserRow;
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
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, userId, plan, status, ecpayTradeNo, ecpayMerchantTradeNo, startDate, endDate")
    .eq("userId", internalUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data as SubscriptionRow;
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

  const supabaseAdmin = getSupabaseAdmin();
  const updateTime = now.toISOString();

  const { data: updatedSubscription, error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan: "FREE",
      status: "EXPIRED",
      updatedAt: updateTime,
    })
    .eq("id", subscription.id)
    .select("id, userId, plan, status, ecpayTradeNo, ecpayMerchantTradeNo, startDate, endDate")
    .single();

  if (error || !updatedSubscription) {
    return subscription;
  }

  return updatedSubscription as SubscriptionRow;
}

async function getUserContext(supabaseId: string): Promise<{
  supabaseId: string;
  internalUserId: string | null;
  plan: PlanName;
  subscription: SubscriptionRow | null;
}> {
  const publicUser = await ensurePublicUserBySupabaseId(supabaseId);

  if (!publicUser?.id) {
    return {
      supabaseId,
      internalUserId: null,
      plan: "FREE",
      subscription: null,
    };
  }

  // 只讀訂閱、不自動建立 FREE 列，與 billing API 同源，避免帳單顯示 Creator 但 usage 顯示 FREE
  const rawSubscription = await getSubscriptionReadOnly(publicUser.id);
  if (!rawSubscription) {
    return {
      supabaseId,
      internalUserId: publicUser.id,
      plan: "FREE",
      subscription: null,
    };
  }

  const subscription = await normalizeSubscriptionState(rawSubscription);

  const statusNormalized = String(subscription.status || "").trim().toUpperCase();
  const planNormalized = String(subscription.plan || "FREE").trim().toUpperCase() as PlanName;

  const isPaidPlan =
    planNormalized === "CREATOR" || planNormalized === "PRO" || planNormalized === "FLAGSHIP";
  const isExplicitlyInactive = statusNormalized === "EXPIRED" || statusNormalized === "CANCELLED";
  const hasPaymentEvidence = Boolean((subscription as any)?.ecpayTradeNo);
  let plan: PlanName =
    isPaidPlan && !isExplicitlyInactive && hasPaymentEvidence ? planNormalized : "FREE";

  // 升級情境：若最新 PAID 訂單方案更高，就以訂單為準
  const supabaseAdmin = getSupabaseAdmin();
  const { data: paidOrder } = await supabaseAdmin
    .from("orders")
    .select("plan, status, paidAt, createdAt")
    .eq("userId", publicUser.id)
    .in("status", ["PAID", "SUCCESS"])
    .order("paidAt", { ascending: false, nullsFirst: false })
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  const paidPlan = String((paidOrder as any)?.plan || "").trim().toUpperCase() as PlanName;
  const isPaidOrderPlan =
    paidPlan === "CREATOR" || paidPlan === "PRO" || paidPlan === "FLAGSHIP";
  if (isPaidOrderPlan && PLAN_LEVEL[paidPlan] > PLAN_LEVEL[plan]) {
    plan = paidPlan;
  }

  return {
    supabaseId,
    internalUserId: publicUser.id,
    plan,
    subscription,
  };
}

export async function getUserPlan(supabaseId: string): Promise<PlanName> {
  const context = await getUserContext(supabaseId);
  return context.plan;
}

/** 僅讀取訂閱方案，不建立 subscription、不拋錯，用於 usage API 錯誤時仍回傳與帳單一致的方案 */
export async function getPlanForSupabaseIdSafe(supabaseId: string): Promise<PlanName> {
  try {
    const publicUser = await ensurePublicUserBySupabaseId(supabaseId);
    if (!publicUser?.id) return "FREE";
    const supabaseAdmin = getSupabaseAdmin();
    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, endDate")
      .eq("userId", publicUser.id)
      .maybeSingle();
    if (error || !sub) return "FREE";
    const plan = String(sub.plan || "FREE").trim().toUpperCase() as PlanName;
    const status = String(sub.status || "").trim().toUpperCase();
    const endDate = sub.endDate ? new Date(sub.endDate) : null;
    if (endDate && !Number.isNaN(endDate.getTime()) && endDate <= new Date())
      return "FREE";
    // 與帳單顯示對齊：只要是付費方案且未過期，就視為有效
    const isPaidPlan = plan === "CREATOR" || plan === "PRO" || plan === "FLAGSHIP";
    if (isPaidPlan) return plan;
    return "FREE";
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
  usage: {
    analyze: {
      used: number;
      limit: number;
      remaining: number;
      cycleStart: string | null;
      cycleEnd: string | null;
    };
    generate: {
      used: number;
      limit: number;
      remaining: number;
      cycleStart: string | null;
      cycleEnd: string | null;
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
  const supabaseAdmin = getSupabaseAdmin();

  // 對齊 public.users（同 email 會 re-link），再用 internal userId 查 subscriptions
  const publicUser = await ensurePublicUserBySupabaseId(supabaseId);
  let internalUserId = publicUser?.id || null;

  let subscription: SubscriptionRow | null = null;
  if (internalUserId) {
    subscription = await getSubscriptionReadOnly(internalUserId);
    if (subscription) {
      subscription = await normalizeSubscriptionState(subscription);
    }
  }
  // 若仍找不到訂閱：再用 auth email 對齊一次（避免 users.supabaseId 映射在特殊情況下不同步）
  if (!subscription) {
    const authUser = await getAuthUserFromSupabaseId(supabaseId);
    const email = (authUser?.email || "").trim().toLowerCase();
    if (email) {
      const { data: byEmail } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      const emailUserId = (byEmail as any)?.id ? String((byEmail as any).id) : null;
      if (emailUserId && emailUserId !== internalUserId) {
        internalUserId = emailUserId;
        subscription = await getSubscriptionReadOnly(internalUserId);
        if (subscription) {
          subscription = await normalizeSubscriptionState(subscription);
        }
      }
    }
  }

  // 最後保險：若訂閱仍查不到或欄位異常，改用已付款訂單推導方案（避免帳單 Creator 但 usage 變回 0/3）
  let paidPlanFromOrders: PlanName | null = null;
  let paidAtAnchor: string | null = null;
  let paidTradeNo: string | null = null;
  let paidMerchantTradeNo: string | null = null;
  if (internalUserId) {
    const { data: paidOrder } = await supabaseAdmin
      .from("orders")
      .select("plan, status, paidAt, createdAt, tradeNo, merchantTradeNo")
      .eq("userId", internalUserId)
      .in("status", ["PAID", "SUCCESS"])
      .order("paidAt", { ascending: false, nullsFirst: false })
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    const p = String((paidOrder as any)?.plan || "").trim().toUpperCase();
    const isPaidPlan =
      p === "CREATOR" || p === "PRO" || p === "FLAGSHIP";
    if (isPaidPlan) {
      paidPlanFromOrders = p as PlanName;
      paidAtAnchor =
        (paidOrder as any)?.paidAt ||
        (paidOrder as any)?.createdAt ||
        null;
      paidTradeNo = (paidOrder as any)?.tradeNo ? String((paidOrder as any).tradeNo) : null;
      paidMerchantTradeNo = (paidOrder as any)?.merchantTradeNo
        ? String((paidOrder as any).merchantTradeNo)
        : null;
    }
  }

  const status = String(subscription?.status || "").trim().toUpperCase();
  const planRaw = String(subscription?.plan || "FREE").trim().toUpperCase();
  const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const isExpired =
    endDate && !Number.isNaN(endDate.getTime()) && endDate <= new Date();

  // 避免「幽靈付費」：subscription 顯示付費，但實際沒有任何付款證據（PAID 訂單 / ecpayTradeNo）
  const isPaidPlan =
    planRaw === "CREATOR" || planRaw === "PRO" || planRaw === "FLAGSHIP";
  const hasPaymentEvidence =
    Boolean((subscription as any)?.ecpayTradeNo) || Boolean(paidPlanFromOrders);
  const planFromSubscription: PlanName =
    !isExpired && isPaidPlan && hasPaymentEvidence ? (planRaw as PlanName) : "FREE";

  // 升級情境：若最新 PAID 訂單方案更高，就以訂單為準（避免付款成功但方案卡在舊的）
  const plan: PlanName =
    paidPlanFromOrders && PLAN_LEVEL[paidPlanFromOrders] > PLAN_LEVEL[planFromSubscription]
      ? paidPlanFromOrders
      : planFromSubscription;

  // best-effort: 自動把 subscriptions.plan 升到已付款訂單的方案（避免下一次又打架）
  if (
    subscription?.id &&
    paidPlanFromOrders &&
    PLAN_LEVEL[paidPlanFromOrders] >
      PLAN_LEVEL[String(subscription.plan || "FREE").trim().toUpperCase() as PlanName]
  ) {
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      plan: paidPlanFromOrders,
      status: "ACTIVE",
      updatedAt: nowIso,
    };
    if (paidTradeNo) updatePayload.ecpayTradeNo = paidTradeNo;
    if (paidMerchantTradeNo) updatePayload.ecpayMerchantTradeNo = paidMerchantTradeNo;
    await supabaseAdmin.from("subscriptions").update(updatePayload).eq("id", subscription.id);
  }

  const { cycleStart, cycleEnd } = getCurrentCycleWindow(
    subscription?.startDate ?? paidAtAnchor ?? null
  );

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartIso = weekStart.toISOString();

  const [{ data: cycleLogs, error: cycleErr }, { data: weekLogs, error: weekErr }] =
    await Promise.all([
      supabaseAdmin
        .from("usage_logs")
        .select("action, createdAt")
        .eq("userId", supabaseId)
        .gte("createdAt", cycleStart)
        .lt("createdAt", cycleEnd),
      supabaseAdmin
        .from("usage_logs")
        .select("action, createdAt")
        .eq("userId", supabaseId)
        .gte("createdAt", weekStartIso),
    ]);

  if (cycleErr) {
    throw new Error(`Failed to check usage: ${cycleErr.message}`);
  }
  if (weekErr) {
    throw new Error(`Failed to check week usage: ${weekErr.message}`);
  }

  const usedAnalyze =
    (cycleLogs || []).filter((row: any) => getActionGroup(row.action) === "ANALYZE")
      .length || 0;
  const usedGenerate =
    (cycleLogs || []).filter((row: any) => getActionGroup(row.action) === "GENERATE")
      .length || 0;

  let weekAnalyze = 0;
  let weekGenerate = 0;
  for (const row of weekLogs || []) {
    const group = getActionGroup((row as any).action);
    if (group === "ANALYZE") weekAnalyze += 1;
    if (group === "GENERATE") weekGenerate += 1;
  }

  const analyzeLimit = LIMITS[plan].ANALYZE;
  const generateLimit = LIMITS[plan].GENERATE;

  return {
    plan,
    usage: {
      analyze: {
        used: usedAnalyze,
        limit: analyzeLimit,
        remaining: Math.max(analyzeLimit - usedAnalyze, 0),
        cycleStart,
        cycleEnd,
      },
      generate: {
        used: usedGenerate,
        limit: generateLimit,
        remaining: Math.max(generateLimit - usedGenerate, 0),
        cycleStart,
        cycleEnd,
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
  const supabaseAdmin = getSupabaseAdmin();
  const { plan, subscription } = await getUserContext(supabaseId);
  const limit = LIMITS[plan][feature];

  const { cycleStart, cycleEnd } = getCurrentCycleWindow(
    subscription?.startDate ?? null
  );

  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .select("action, createdAt")
    .eq("userId", supabaseId)
    .gte("createdAt", cycleStart)
    .lt("createdAt", cycleEnd);

  if (error) {
    throw new Error(`Failed to check usage: ${error.message}`);
  }

  const used =
    (data || []).filter((row) => getActionGroup(row.action) === feature)
      .length || 0;

  const remaining = Math.max(limit - used, 0);

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
  const supabaseAdmin = getSupabaseAdmin();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const startIso = weekStart.toISOString();

  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .select("action")
    .eq("userId", supabaseId)
    .gte("createdAt", startIso);

  if (error) {
    return { analyze: 0, generate: 0 };
  }

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
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin.from("usage_logs").insert({
    id: crypto.randomUUID(),
    userId,
    action,
    date: now,
    createdAt: now,
  });

  if (error) {
    throw new Error(`Failed to log usage: ${error.message}`);
  }
}