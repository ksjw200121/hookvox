import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest, ensurePublicUserBySupabaseId } from "@/lib/usage-checker";
import { buildQueryString, encryptTradeInfo, generateTradeSha } from "@/lib/newebpay-utils";

export const runtime = "nodejs";

type BillingCycle = "monthly" | "quarterly" | "biannual" | "annual";
type PlanName = "CREATOR" | "PRO" | "FLAGSHIP";
type CurrentPlanName = "FREE" | "CREATOR" | "PRO" | "FLAGSHIP";

const PLAN_MONTHLY_PRICE: Record<PlanName, number> = {
  CREATOR: 699,
  PRO: 1599,
  FLAGSHIP: 2999,
};

const BILLING_OPTIONS: Record<
  BillingCycle,
  { months: number; multiplier: number }
> = {
  monthly: { months: 1, multiplier: 1 },
  quarterly: { months: 3, multiplier: 0.9 },
  biannual: { months: 6, multiplier: 0.85 },
  annual: { months: 12, multiplier: 0.8 },
};

const PLAN_LEVEL: Record<CurrentPlanName, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  FLAGSHIP: 3,
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function makeMerchantOrderNo(userId: string) {
  const timePart = Date.now().toString().slice(-10);
  const userPart = userId.replace(/-/g, "").slice(0, 8);
  return `HV${timePart}${userPart}`.slice(0, 20);
}

function calcAmount(plan: PlanName, billingCycle: BillingCycle) {
  const monthly = PLAN_MONTHLY_PRICE[plan];
  const opt = BILLING_OPTIONS[billingCycle];
  return Math.round(monthly * opt.months * opt.multiplier);
}

function getPlanLabel(plan: PlanName) {
  if (plan === "CREATOR") return "Creator";
  if (plan === "PRO") return "專業版";
  return "旗艦版";
}

function getCycleLabel(cycle: BillingCycle) {
  if (cycle === "monthly") return "月繳";
  if (cycle === "quarterly") return "季繳";
  if (cycle === "biannual") return "半年繳";
  return "年繳";
}

export async function POST(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);

    if (!supabaseId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    const body = await req.json();
    const plan = String(body?.plan || "").trim().toUpperCase() as PlanName;
    const billingCycle = String(body?.billingCycle || "").trim() as BillingCycle;

    if (!["CREATOR", "PRO", "FLAGSHIP"].includes(plan)) {
      return NextResponse.json({ error: "無效的方案" }, { status: 400 });
    }

    if (!["monthly", "quarterly", "biannual", "annual"].includes(billingCycle)) {
      return NextResponse.json({ error: "無效的繳費週期" }, { status: 400 });
    }

    if (
      !process.env.NEWEBPAY_MERCHANT_ID ||
      !process.env.NEWEBPAY_HASH_KEY ||
      !process.env.NEWEBPAY_HASH_IV
    ) {
      return NextResponse.json({ error: "藍新環境變數未設定完成" }, { status: 500 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const publicUser = await ensurePublicUserBySupabaseId(supabaseId);
    if (!publicUser?.id) {
      return NextResponse.json({ error: "找不到對應的使用者資料" }, { status: 400 });
    }

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan, status, startDate, endDate, newebpayTradeNo")
      .eq("userId", publicUser.id)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json(
        { error: `讀取訂閱資料失敗: ${subscriptionError.message}` },
        { status: 500 }
      );
    }

    if (!subscription?.id) {
      const nowIso = new Date().toISOString();
      const { error: insertSubErr } = await supabaseAdmin.from("subscriptions").insert({
        id: crypto.randomUUID(),
        userId: publicUser.id,
        plan: "FREE",
        status: "ACTIVE",
        startDate: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (insertSubErr) {
        return NextResponse.json(
          { error: `建立訂閱資料失敗: ${insertSubErr.message}` },
          { status: 500 }
        );
      }
    }

    let currentPlan: CurrentPlanName = "FREE";

    const { data: paidOrder } = await supabaseAdmin
      .from("orders")
      .select("plan, status, paidAt, createdAt, billingCycle, amount")
      .eq("userId", publicUser.id)
      .in("status", ["PAID", "SUCCESS"])
      .order("paidAt", { ascending: false, nullsFirst: false })
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscription?.status === "ACTIVE") {
      const rawPlan = String(subscription.plan || "FREE").toUpperCase() as CurrentPlanName;
      const isPaid =
        rawPlan === "CREATOR" || rawPlan === "PRO" || rawPlan === "FLAGSHIP";
      const hasEvidence = Boolean((subscription as any)?.newebpayTradeNo || (subscription as any)?.ecpayTradeNo);

      if (isPaid && hasEvidence) {
        currentPlan = rawPlan;
        if (subscription.endDate) {
          const endDate = new Date(subscription.endDate);
          if (!Number.isNaN(endDate.getTime()) && new Date() > endDate) {
            currentPlan = "FREE";
          }
        }
      } else {
        if (isPaid && subscription?.id) {
          const nowIso = new Date().toISOString();
          await supabaseAdmin
            .from("subscriptions")
            .update({ plan: "FREE", status: "ACTIVE", updatedAt: nowIso })
            .eq("id", subscription.id);
        }
        currentPlan = "FREE";
      }
    }

    const currentBillingCycle = String((paidOrder as any)?.billingCycle || "").trim() as BillingCycle | "";

    if (plan === currentPlan) {
      return NextResponse.json(
        { error: "你目前已經是此方案，不能重複購買" },
        { status: 400 }
      );
    }

    if (PLAN_LEVEL[plan] < PLAN_LEVEL[currentPlan]) {
      return NextResponse.json(
        { error: "無法購買低於目前方案的訂閱" },
        { status: 400 }
      );
    }

    if (
      currentPlan !== "FREE" &&
      currentBillingCycle &&
      billingCycle !== currentBillingCycle
    ) {
      return NextResponse.json(
        { error: "升級時只能選擇與目前方案相同的訂閱週期" },
        { status: 400 }
      );
    }

    let { data: pendingOrders, error: pendingOrderError } = await supabaseAdmin
      .from("orders")
      .select("id, plan, billingCycle, merchantTradeNo, createdAt")
      .eq("userId", publicUser.id)
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false })
      .limit(1);

    if (pendingOrderError) {
      return NextResponse.json(
        { error: `檢查待付款訂單失敗: ${pendingOrderError.message}` },
        { status: 500 }
      );
    }

    if (pendingOrders && pendingOrders.length > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      const { data: retryPending } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("userId", publicUser.id)
        .eq("status", "PENDING")
        .limit(1);
      if (retryPending && retryPending.length === 0) {
        pendingOrders = [];
      }
    }

    if (pendingOrders && pendingOrders.length > 0) {
      return NextResponse.json(
        { error: "已有待付款訂單，請先完成付款或稍後再試" },
        { status: 400 }
      );
    }

    const merchantOrderNo = makeMerchantOrderNo(supabaseId);

    const isUpgrade =
      currentPlan !== "FREE" && PLAN_LEVEL[plan] > PLAN_LEVEL[currentPlan];
    const fullAmount = calcAmount(plan, billingCycle);
    const currentAmount = isUpgrade
      ? Number((paidOrder as any)?.amount || 0)
      : 0;
    const amount = isUpgrade
      ? Math.max(1, Math.round(fullAmount - currentAmount))
      : fullAmount;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const notifyUrl = `${appUrl}/api/newebpay/notify`;
    const returnUrl = `${appUrl}/api/newebpay/return`;
    const clientBackUrl = `${appUrl}/plans`;

    const nowIso = new Date().toISOString();

    const { error: orderInsertError } = await supabaseAdmin.from("orders").insert({
      userId: publicUser.id,
      plan,
      billingCycle,
      amount,
      merchantTradeNo: merchantOrderNo,
      status: "PENDING",
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (orderInsertError) {
      return NextResponse.json(
        { error: `建立訂單失敗: ${orderInsertError.message}` },
        { status: 500 }
      );
    }

    const { error: subscriptionUpdateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        newebpayMerchantOrderNo: merchantOrderNo,
        updatedAt: nowIso,
      })
      .eq("userId", publicUser.id);

    if (subscriptionUpdateError) {
      return NextResponse.json(
        { error: `暫存訂單編號失敗: ${subscriptionUpdateError.message}` },
        { status: 500 }
      );
    }

    // 組合 TradeInfo 參數
    const tradeInfoParams: Record<string, string | number> = {
      MerchantID: process.env.NEWEBPAY_MERCHANT_ID!,
      RespondType: "JSON",
      TimeStamp: Math.floor(Date.now() / 1000).toString(),
      Version: "2.0",
      MerchantOrderNo: merchantOrderNo,
      Amt: amount,
      ItemDesc: `Hookvox ${getPlanLabel(plan)}-${getCycleLabel(billingCycle)}`,
      Email: publicUser.email || "",
      NotifyURL: notifyUrl,
      ReturnURL: returnUrl,
      ClientBackURL: clientBackUrl,
      // 付款方式：信用卡 + ATM + 超商
      CREDIT: 1,
      VACC: 1,
      CVS: 1,
      // 自訂欄位（藍新用 OrderComment 傳遞）
      OrderComment: `${supabaseId}|${plan}|${billingCycle}`,
    };

    const tradeInfoString = buildQueryString(tradeInfoParams);
    const encryptedTradeInfo = encryptTradeInfo(tradeInfoString);
    const tradeSha = generateTradeSha(encryptedTradeInfo);

    const gatewayUrl =
      process.env.NEWEBPAY_GATEWAY_URL ||
      "https://core.newebpay.com/MPG/mpg_gateway";

    const paymentHtml = `
      <form id="newebpay-form" method="post" action="${gatewayUrl}">
        <input type="hidden" name="MerchantID" value="${process.env.NEWEBPAY_MERCHANT_ID!}" />
        <input type="hidden" name="TradeInfo" value="${encryptedTradeInfo}" />
        <input type="hidden" name="TradeSha" value="${tradeSha}" />
        <input type="hidden" name="Version" value="2.0" />
      </form>
    `.trim();

    return NextResponse.json({
      success: true,
      paymentHtml,
      merchantTradeNo: merchantOrderNo,
      amount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "建立藍新訂單失敗" },
      { status: 500 }
    );
  }
}
