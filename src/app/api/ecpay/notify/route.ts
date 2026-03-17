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

function resolveClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "unknown";
}

async function logWebhookEvent(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  req: Request,
  body: Record<string, string>,
  meta: {
    ok: boolean;
    stage: string;
    message?: string;
    checkMacValid?: boolean;
  }
) {
  const enabled = (process.env.ECPAY_WEBHOOK_AUDIT_ENABLED || "true") === "true";
  if (!enabled) return;

  // Avoid bloating DB: keep raw but it's already small (form post)
  const ip = resolveClientIp(req);
  const ua = req.headers.get("user-agent") || null;

  const tradeAmt = Number(body.TradeAmt || body.amount || 0);
  const rtnCode = body.RtnCode || null;

  const insertPayload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    provider: "ECPAY",
    ok: meta.ok,
    stage: meta.stage,
    message: meta.message || null,
    check_mac_valid: typeof meta.checkMacValid === "boolean" ? meta.checkMacValid : null,
    merchant_trade_no: body.MerchantTradeNo || null,
    trade_no: body.TradeNo || null,
    rtn_code: rtnCode,
    trade_amt: Number.isFinite(tradeAmt) ? tradeAmt : null,
    ip,
    user_agent: ua,
    raw: body,
    created_at: new Date().toISOString(),
  };

  try {
    await supabaseAdmin.from("payment_webhook_events").insert(insertPayload);
  } catch {
    // Never block payment processing due to audit logging failures
  }
}

export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const formData = await req.formData();
    const body = Object.fromEntries(formData.entries()) as Record<string, string>;

    const receivedCheckMacValue = body.CheckMacValue;
    const expectedCheckMacValue = generateCheckMacValue(body);

    if (!receivedCheckMacValue || receivedCheckMacValue !== expectedCheckMacValue) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "CHECK_MAC",
        message: "CheckMacValue 驗證失敗",
        checkMacValid: false,
      });
      return new Response("0|CheckMacValue 驗證失敗", { status: 400 });
    }

    if (body.RtnCode !== "1") {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: true,
        stage: "RTN_CODE_NOT_SUCCESS",
        message: `RtnCode=${body.RtnCode || ""}`,
        checkMacValid: true,
      });
      return new Response("1|OK");
    }

    const supabaseId = body.CustomField1;
    const plan = String(body.CustomField2 || "").toUpperCase() as PlanName;
    const billingCycle = String(body.CustomField3 || "") as BillingCycle;
    const merchantTradeNo = body.MerchantTradeNo;
    const tradeNo = body.TradeNo;
    const totalAmount = Number(body.TradeAmt || body.amount || 0);

    if (!supabaseId || !merchantTradeNo || !tradeNo) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "VALIDATE_FIELDS",
        message: "缺少必要欄位",
        checkMacValid: true,
      });
      return new Response("0|缺少必要欄位", { status: 400 });
    }

    if (!["CREATOR", "PRO", "FLAGSHIP"].includes(plan)) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "VALIDATE_PLAN",
        message: "方案錯誤",
        checkMacValid: true,
      });
      return new Response("0|方案錯誤", { status: 400 });
    }

    if (!["monthly", "quarterly", "biannual", "annual"].includes(billingCycle)) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "VALIDATE_CYCLE",
        message: "週期錯誤",
        checkMacValid: true,
      });
      return new Response("0|週期錯誤", { status: 400 });
    }

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("supabaseId", supabaseId)
      .maybeSingle();

    if (userError || !publicUser?.id) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "LOAD_USER",
        message: "找不到使用者",
        checkMacValid: true,
      });
      return new Response("0|找不到使用者", { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, userId, plan, billingCycle, amount, merchantTradeNo, tradeNo, status, createdAt, paidAt")
      .eq("merchantTradeNo", merchantTradeNo)
      .maybeSingle();

    if (orderError || !order?.id) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "LOAD_ORDER",
        message: "找不到訂單",
        checkMacValid: true,
      });
      return new Response("0|找不到訂單", { status: 400 });
    }

    if (order.userId !== publicUser.id) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "ORDER_MISMATCH_USER",
        message: "訂單使用者不符",
        checkMacValid: true,
      });
      return new Response("0|訂單使用者不符", { status: 400 });
    }

    if (order.plan !== plan || order.billingCycle !== billingCycle) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "ORDER_MISMATCH_DATA",
        message: "訂單資料不符",
        checkMacValid: true,
      });
      return new Response("0|訂單資料不符", { status: 400 });
    }

    if (Number(order.amount) !== totalAmount) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "ORDER_MISMATCH_AMOUNT",
        message: "付款金額不符",
        checkMacValid: true,
      });
      return new Response("0|付款金額不符", { status: 400 });
    }

    if (order.status === "PAID") {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: true,
        stage: "ALREADY_PAID",
        message: "order already paid",
        checkMacValid: true,
      });
      return new Response("1|OK");
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, userId, plan, status, ecpayTradeNo, ecpayMerchantTradeNo, startDate, endDate")
      .eq("userId", publicUser.id)
      .maybeSingle();

    if (subError) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "LOAD_SUBSCRIPTION",
        message: subError.message,
        checkMacValid: true,
      });
      return new Response("0|讀取訂閱資料失敗", { status: 500 });
    }

    // 新註冊用戶可能還沒有 subscriptions 列（以前只有在 usage 時才會建立）。
    // 付款成功時要能自動補上，否則會出現「交易完成但帳單仍未生效」。
    const hasSubscription = Boolean(subscription?.id);
    const currentPlan = String(subscription?.plan || "FREE").toUpperCase() as CurrentPlanName;

    if (PLAN_LEVEL[plan] < PLAN_LEVEL[currentPlan]) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: true,
        stage: "DOWNGRADE_IGNORED",
        message: "ignore downgrade payment",
        checkMacValid: true,
      });
      return new Response("1|OK");
    }

    if (PLAN_LEVEL[plan] === PLAN_LEVEL[currentPlan]) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: true,
        stage: "SAME_PLAN_IGNORED",
        message: "ignore same plan payment",
        checkMacValid: true,
      });
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

    if (hasSubscription) {
      const { error: updateSubscriptionError } = await supabaseAdmin
        .from("subscriptions")
        .update(updatePayload)
        .eq("id", subscription!.id);

      if (updateSubscriptionError) {
        await logWebhookEvent(supabaseAdmin, req, body, {
          ok: false,
          stage: "UPDATE_SUBSCRIPTION",
          message: updateSubscriptionError.message,
          checkMacValid: true,
        });
        return new Response(
          `0|更新訂閱失敗:${updateSubscriptionError.message}`,
          { status: 500 }
        );
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
          startDate: (updatePayload.startDate as string) || updateTime,
          endDate: (updatePayload.endDate as string) || null,
          createdAt: updateTime,
          updatedAt: updateTime,
        });

      if (insertSubscriptionError) {
        await logWebhookEvent(supabaseAdmin, req, body, {
          ok: false,
          stage: "INSERT_SUBSCRIPTION",
          message: insertSubscriptionError.message,
          checkMacValid: true,
        });
        return new Response(
          `0|建立訂閱失敗:${insertSubscriptionError.message}`,
          { status: 500 }
        );
      }
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
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "UPDATE_ORDER",
        message: updateOrderError.message,
        checkMacValid: true,
      });
      return new Response(
        `0|更新訂單失敗:${updateOrderError.message}`,
        { status: 500 }
      );
    }

    await logWebhookEvent(supabaseAdmin, req, body, {
      ok: true,
      stage: "SUCCESS",
      message: "paid and upgraded",
      checkMacValid: true,
    });
    return new Response("1|OK");
  } catch (error: any) {
    // best-effort logging
    try {
      const formData = await req.formData();
      const body = Object.fromEntries(formData.entries()) as Record<string, string>;
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: "EXCEPTION",
        message: String(error?.message || "notify failed"),
      });
    } catch {}

    return new Response(`0|${error?.message || "notify failed"}`, {
      status: 500,
    });
  }
}