import crypto from "crypto";
import {
  createSupabaseAdmin,
  processPaidEcpayOrder,
  type EcpayBillingCycle,
  type EcpayPlanName,
} from "@/lib/ecpay-payment";
import { generateCheckMacValue } from "@/lib/ecpay-utils";

export const runtime = "nodejs";

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
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>,
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
  const supabaseAdmin = createSupabaseAdmin();
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

    // ── 防重播：同一筆交易已處理成功過，直接回 1|OK 不重複執行 ──
    const existingTradeNo = body.MerchantTradeNo;
    if (existingTradeNo) {
      const { data: existing } = await supabaseAdmin
        .from("payment_webhook_events")
        .select("id")
        .eq("merchant_trade_no", existingTradeNo)
        .eq("ok", true)
        .eq("stage", "SUCCESS")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await logWebhookEvent(supabaseAdmin, req, body, {
          ok: true,
          stage: "DUPLICATE_IGNORED",
          message: "此交易已成功處理過，忽略重複通知",
          checkMacValid: true,
        });
        return new Response("1|OK");
      }
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
    const plan = String(body.CustomField2 || "").toUpperCase() as EcpayPlanName;
    const billingCycle = String(body.CustomField3 || "") as EcpayBillingCycle;
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

    // ── 幂等性檢查：防止 ECPay 重試導致重複處理 ──
    const { data: existingPaid } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("merchantTradeNo", merchantTradeNo)
      .in("status", ["PAID", "SUCCESS"])
      .limit(1);
    if (existingPaid && existingPaid.length > 0) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: true,
        stage: "IDEMPOTENT_SKIP",
        message: "此訂單已處理過，跳過重複通知",
        checkMacValid: true,
      });
      return new Response("1|OK");
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

    const result = await processPaidEcpayOrder({
      supabaseAdmin,
      supabaseId,
      merchantTradeNo,
      tradeNo,
      plan,
      billingCycle,
      totalAmount,
    });

    if (!result.ok) {
      await logWebhookEvent(supabaseAdmin, req, body, {
        ok: false,
        stage: result.stage,
        message: result.message,
        checkMacValid: true,
      });
      return new Response(`0|${result.message}`, { status: 400 });
    }

    await logWebhookEvent(supabaseAdmin, req, body, {
      ok: true,
      stage: result.stage,
      message: result.message,
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