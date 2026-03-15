import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PlanName = "CREATOR" | "PRO" | "FLAGSHIP";
type CurrentPlanName = "FREE" | "CREATOR" | "PRO" | "FLAGSHIP";
type BillingCycle = "monthly" | "quarterly" | "biannual" | "annual";

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

function addMonths(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getCycleMonths(cycle: BillingCycle) {
  if (cycle === "monthly") return 1;
  if (cycle === "quarterly") return 3;
  if (cycle === "biannual") return 6;
  return 12;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const body = Object.fromEntries(formData.entries()) as Record<string, string>;

    const receivedCheckMacValue = body.CheckMacValue;
    const expectedCheckMacValue = generateCheckMacValue(body);

    if (!receivedCheckMacValue || receivedCheckMacValue !== expectedCheckMacValue) {
      return new Response("0|CheckMacValue 驗證失敗", { status: 400 });
    }

    if (body.RtnCode !== "1") {
      return new Response("1|OK");
    }

    const supabaseId = body.CustomField1;
    const plan = String(body.CustomField2 || "").toUpperCase() as PlanName;
    const billingCycle = String(body.CustomField3 || "") as BillingCycle;
    const merchantTradeNo = body.MerchantTradeNo;
    const tradeNo = body.TradeNo;
    const totalAmount = Number(body.TradeAmt || body.amount || 0);

    if (!supabaseId || !merchantTradeNo || !tradeNo) {
      return new Response("0|缺少必要欄位", { status: 400 });
    }

    if (!["CREATOR", "PRO", "FLAGSHIP"].includes(plan)) {
      return new Response("0|方案錯誤", { status: 400 });
    }

    if (!["monthly", "quarterly", "biannual", "annual"].includes(billingCycle)) {
      return new Response("0|週期錯誤", { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("supabaseId", supabaseId)
      .maybeSingle();

    if (userError || !publicUser?.id) {
      return new Response("0|找不到使用者", { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, userId, plan, billingCycle, amount, merchantTradeNo, tradeNo, status, createdAt, paidAt")
      .eq("merchantTradeNo", merchantTradeNo)
      .maybeSingle();

    if (orderError || !order?.id) {
      return new Response("0|找不到訂單", { status: 400 });
    }

    if (order.userId !== publicUser.id) {
      return new Response("0|訂單使用者不符", { status: 400 });
    }

    if (order.plan !== plan || order.billingCycle !== billingCycle) {
      return new Response("0|訂單資料不符", { status: 400 });
    }

    if (Number(order.amount) !== totalAmount) {
      return new Response("0|付款金額不符", { status: 400 });
    }

    if (order.status === "PAID") {
      return new Response("1|OK");
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, userId, plan, status, ecpayTradeNo, ecpayMerchantTradeNo, startDate, endDate")
      .eq("userId", publicUser.id)
      .maybeSingle();

    if (subError || !subscription?.id) {
      return new Response("0|找不到訂閱資料", { status: 400 });
    }

    const currentPlan = String(subscription.plan || "FREE").toUpperCase() as CurrentPlanName;

    if (PLAN_LEVEL[plan] < PLAN_LEVEL[currentPlan]) {
      return new Response("1|OK");
    }

    if (PLAN_LEVEL[plan] === PLAN_LEVEL[currentPlan]) {
      return new Response("1|OK");
    }

    const now = new Date();
    const updateTime = new Date().toISOString();

    // 升級（本期內加購更高方案）：不重算週期，次數延續。到期後重購 = 新週期，次數重置，收方案全額。
    const isUpgrade =
      subscription.status === "ACTIVE" &&
      subscription.endDate &&
      !Number.isNaN(new Date(subscription.endDate).getTime()) &&
      new Date(subscription.endDate) > now;

    const updatePayload: Record<string, unknown> = {
      plan,
      status: "ACTIVE",
      ecpayTradeNo: tradeNo,
      ecpayMerchantTradeNo: merchantTradeNo,
      updatedAt: updateTime,
    };

    if (isUpgrade) {
      // 升級：不重算週期，只改方案與額度上限，本期已用次數延續；startDate / endDate 不變
    } else {
      // 新訂閱或到期後重購：重算週期（下個月時間到會重置），收的是方案全額
      const months = getCycleMonths(billingCycle);
      updatePayload.startDate = now.toISOString();
      updatePayload.endDate = addMonths(now, months).toISOString();
    }

    const { error: updateSubscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .update(updatePayload)
      .eq("id", subscription.id);

    if (updateSubscriptionError) {
      return new Response(
        `0|更新訂閱失敗:${updateSubscriptionError.message}`,
        { status: 500 }
      );
    }

    const { error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "PAID",
        tradeNo,
        paidAt: updateTime,
        updatedAt: updateTime,
      })
      .eq("id", order.id);

    if (updateOrderError) {
      return new Response(
        `0|更新訂單失敗:${updateOrderError.message}`,
        { status: 500 }
      );
    }

    return new Response("1|OK");
  } catch (error: any) {
    return new Response(`0|${error?.message || "notify failed"}`, {
      status: 500,
    });
  }
}