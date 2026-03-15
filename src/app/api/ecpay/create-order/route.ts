import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";

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

function generateCheckMacValue(params: Record<string, string>) {
  const hashKey = process.env.ECPAY_HASH_KEY!;
  const hashIv = process.env.ECPAY_HASH_IV!;

  const sorted = Object.entries(params)
    .filter(([key]) => key !== "CheckMacValue")
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIv}`;
  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");

  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

function makeMerchantTradeNo(userId: string) {
  const timePart = Date.now().toString().slice(-10);
  const userPart = userId.replace(/-/g, "").slice(0, 8);
  return `HV${timePart}${userPart}`.slice(0, 20);
}

function getTradeDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  const hh = `${now.getHours()}`.padStart(2, "0");
  const mi = `${now.getMinutes()}`.padStart(2, "0");
  const ss = `${now.getSeconds()}`.padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
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
      return NextResponse.json({ error: "未登入" }, { status: 401 });
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
      !process.env.ECPAY_MERCHANT_ID ||
      !process.env.ECPAY_HASH_KEY ||
      !process.env.ECPAY_HASH_IV
    ) {
      return NextResponse.json({ error: "綠界環境變數未設定完成" }, { status: 500 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("supabaseId", supabaseId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: `讀取使用者失敗: ${userError.message}` },
        { status: 500 }
      );
    }

    if (!publicUser?.id) {
      return NextResponse.json({ error: "找不到對應的使用者資料" }, { status: 400 });
    }

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan, status, endDate")
      .eq("userId", publicUser.id)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json(
        { error: `讀取訂閱資料失敗: ${subscriptionError.message}` },
        { status: 500 }
      );
    }

    let currentPlan: CurrentPlanName = "FREE";

    if (subscription?.status === "ACTIVE") {
      const rawPlan = String(subscription.plan || "FREE").toUpperCase() as CurrentPlanName;
      currentPlan = ["FREE", "CREATOR", "PRO", "FLAGSHIP"].includes(rawPlan)
        ? rawPlan
        : "FREE";

      if (subscription.endDate) {
        const endDate = new Date(subscription.endDate);
        if (!Number.isNaN(endDate.getTime()) && new Date() > endDate) {
          currentPlan = "FREE";
        }
      }
    }

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

    const { data: pendingOrders, error: pendingOrderError } = await supabaseAdmin
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
      return NextResponse.json(
        { error: "已有待付款訂單，請先完成付款或稍後再試" },
        { status: 400 }
      );
    }

    const merchantTradeNo = makeMerchantTradeNo(supabaseId);

    // 升級：只收差額。續訂（到期後再買）：currentPlan 已為 FREE，收方案全額。
    const isUpgrade =
      currentPlan !== "FREE" && PLAN_LEVEL[plan] > PLAN_LEVEL[currentPlan];
    const fullAmount = calcAmount(plan, billingCycle);
    const currentAmount = isUpgrade ? calcAmount(currentPlan as PlanName, billingCycle) : 0;
    const amount = isUpgrade
      ? Math.max(1, Math.round(fullAmount - currentAmount))
      : fullAmount;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const notifyUrl =
      process.env.ECPAY_NOTIFY_URL || `${appUrl}/api/ecpay/notify`;
    const resultUrl = `${appUrl}/api/ecpay/return`;
    const clientBackUrl =
      process.env.ECPAY_RETURN_URL || `${appUrl}/plans`;

    const customField1 = supabaseId;
    const customField2 = plan;
    const customField3 = billingCycle;

    const nowIso = new Date().toISOString();

    const { error: orderInsertError } = await supabaseAdmin.from("orders").insert({
      userId: publicUser.id,
      plan,
      billingCycle,
      amount,
      merchantTradeNo,
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
        ecpayMerchantTradeNo: merchantTradeNo,
        updatedAt: nowIso,
      })
      .eq("userId", publicUser.id);

    if (subscriptionUpdateError) {
      return NextResponse.json(
        { error: `暫存訂單編號失敗: ${subscriptionUpdateError.message}` },
        { status: 500 }
      );
    }

    const params: Record<string, string> = {
      MerchantID: process.env.ECPAY_MERCHANT_ID!,
      MerchantTradeNo: merchantTradeNo,
      MerchantTradeDate: getTradeDate(),
      PaymentType: "aio",
      TotalAmount: String(amount),
      TradeDesc: "Hookvox 訂閱升級",
      ItemName: `${getPlanLabel(plan)}-${getCycleLabel(billingCycle)}`,
      ReturnURL: notifyUrl,
      ChoosePayment: "Credit",
      ClientBackURL: clientBackUrl,
      OrderResultURL: resultUrl,
      NeedExtraPaidInfo: "Y",
      EncryptType: "1",
      CustomField1: customField1,
      CustomField2: customField2,
      CustomField3: customField3,
    };

    const checkMacValue = generateCheckMacValue(params);
    const finalParams = { ...params, CheckMacValue: checkMacValue };

    const paymentUrl =
      process.env.ECPAY_PAYMENT_URL ||
      "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

    const paymentHtml = `
      <form id="ecpay-form" method="post" action="${paymentUrl}">
        ${Object.entries(finalParams)
          .map(
            ([key, value]) =>
              `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, "&quot;")}" />`
          )
          .join("")}
      </form>
    `.trim();

    return NextResponse.json({
      success: true,
      paymentHtml,
      merchantTradeNo,
      amount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "建立綠界訂單失敗" },
      { status: 500 }
    );
  }
}