import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export type EcpayPlanName = "CREATOR" | "PRO" | "FLAGSHIP";
export type EcpayCurrentPlanName = "FREE" | "CREATOR" | "PRO" | "FLAGSHIP";
export type EcpayBillingCycle = "monthly" | "quarterly" | "biannual" | "annual";

const PLAN_LEVEL: Record<EcpayCurrentPlanName, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  FLAGSHIP: 3,
};

function getCycleMonths(cycle: EcpayBillingCycle) {
  if (cycle === "monthly") return 1;
  if (cycle === "quarterly") return 3;
  if (cycle === "biannual") return 6;
  return 12;
}

function addMonths(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type ProcessPaidEcpayOrderInput = {
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>;
  supabaseId: string;
  merchantTradeNo: string;
  tradeNo: string;
  plan: EcpayPlanName;
  billingCycle: EcpayBillingCycle;
  totalAmount: number;
};

type ProcessPaidEcpayOrderResult =
  | { ok: true; stage: string; message: string; publicUserId: string; orderId: string }
  | { ok: false; stage: string; message: string };

export async function processPaidEcpayOrder(
  input: ProcessPaidEcpayOrderInput
): Promise<ProcessPaidEcpayOrderResult> {
  const {
    supabaseAdmin,
    supabaseId,
    merchantTradeNo,
    tradeNo,
    plan,
    billingCycle,
    totalAmount,
  } = input;

  const { data: publicUser, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("supabaseId", supabaseId)
    .maybeSingle();

  if (userError || !publicUser?.id) {
    return {
      ok: false,
      stage: "LOAD_USER",
      message: userError?.message || "找不到使用者",
    };
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, userId, plan, billingCycle, amount, status")
    .eq("merchantTradeNo", merchantTradeNo)
    .maybeSingle();

  if (orderError || !order?.id) {
    return {
      ok: false,
      stage: "LOAD_ORDER",
      message: orderError?.message || "找不到訂單",
    };
  }

  if (order.userId !== publicUser.id) {
    return {
      ok: false,
      stage: "ORDER_MISMATCH_USER",
      message: "訂單使用者不符",
    };
  }

  if (
    String(order.plan || "").toUpperCase() !== plan ||
    String(order.billingCycle || "") !== billingCycle
  ) {
    return {
      ok: false,
      stage: "ORDER_MISMATCH_DATA",
      message: "訂單資料不符",
    };
  }

  if (Number(order.amount) !== totalAmount) {
    return {
      ok: false,
      stage: "ORDER_MISMATCH_AMOUNT",
      message: "付款金額不符",
    };
  }

  const { data: subscription, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, userId, plan, status, startDate, endDate, ecpayTradeNo, ecpayMerchantTradeNo")
    .eq("userId", publicUser.id)
    .maybeSingle();

  if (subError) {
    return {
      ok: false,
      stage: "LOAD_SUBSCRIPTION",
      message: subError.message,
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const months = getCycleMonths(billingCycle);
  const normalizedSubPlan = String(subscription?.plan || "FREE")
    .trim()
    .toUpperCase() as EcpayCurrentPlanName;
  const currentEndDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const isCurrentEndValid =
    Boolean(currentEndDate) && !Number.isNaN(currentEndDate!.getTime());
  const isActiveCurrent =
    subscription?.status === "ACTIVE" &&
    isCurrentEndValid &&
    currentEndDate! > now;
  const currentPlanLevel = isActiveCurrent ? PLAN_LEVEL[normalizedSubPlan] ?? 0 : 0;
  const incomingPlanLevel = PLAN_LEVEL[plan] ?? 0;
  const orderAlreadyPaid = String(order.status || "").toUpperCase() === "PAID";

  if (!orderAlreadyPaid) {
    const { error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "PAID",
        tradeNo,
        paidAt: nowIso,
        updatedAt: nowIso,
      })
      .eq("id", order.id);

    if (updateOrderError) {
      return {
        ok: false,
        stage: "UPDATE_ORDER",
        message: updateOrderError.message,
      };
    }
  }

  if (isActiveCurrent && incomingPlanLevel <= currentPlanLevel) {
    return {
      ok: true,
      stage:
        incomingPlanLevel < currentPlanLevel
          ? "DOWNGRADE_PAID_NO_CHANGE"
          : "SAME_PLAN_PAID_NO_CHANGE",
      message: "已記錄付款，但不調整目前有效訂閱",
      publicUserId: publicUser.id,
      orderId: order.id,
    };
  }

  const subscriptionPayload: Record<string, unknown> = {
    plan,
    status: "ACTIVE",
    ecpayTradeNo: tradeNo,
    ecpayMerchantTradeNo: merchantTradeNo,
    updatedAt: nowIso,
  };

  if (isActiveCurrent && incomingPlanLevel > currentPlanLevel) {
    if (subscription?.startDate) subscriptionPayload.startDate = subscription.startDate;
    if (subscription?.endDate) subscriptionPayload.endDate = subscription.endDate;
  } else {
    subscriptionPayload.startDate = nowIso;
    subscriptionPayload.endDate = addMonths(now, months).toISOString();
  }

  if (subscription?.id) {
    const { error: updateSubscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .update(subscriptionPayload)
      .eq("id", subscription.id);

    if (updateSubscriptionError) {
      return {
        ok: false,
        stage: "UPDATE_SUBSCRIPTION",
        message: updateSubscriptionError.message,
      };
    }
  } else {
    const { error: insertSubscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        id: crypto.randomUUID(),
        userId: publicUser.id,
        plan,
        status: "ACTIVE",
        ecpayTradeNo: tradeNo,
        ecpayMerchantTradeNo: merchantTradeNo,
        startDate: String(subscriptionPayload.startDate || nowIso),
        endDate: (subscriptionPayload.endDate as string) || null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

    if (insertSubscriptionError) {
      return {
        ok: false,
        stage: "INSERT_SUBSCRIPTION",
        message: insertSubscriptionError.message,
      };
    }
  }

  return {
    ok: true,
    stage: orderAlreadyPaid ? "REPAIRED_SUBSCRIPTION_AFTER_PAID_ORDER" : "SUCCESS",
    message: "付款已完成並同步訂閱狀態",
    publicUserId: publicUser.id,
    orderId: order.id,
  };
}
