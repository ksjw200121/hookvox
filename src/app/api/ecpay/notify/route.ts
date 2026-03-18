import crypto from "crypto";
import {
  createSupabaseAdmin,
  processPaidEcpayOrder,
  type EcpayBillingCycle,
  type EcpayPlanName,
} from "@/lib/ecpay-payment";

export const runtime = "nodejs";

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