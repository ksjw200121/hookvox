import crypto from "crypto";
import {
  createSupabaseAdmin,
  processPaidOrder,
  type BillingCycle,
  type PlanName,
} from "@/lib/newebpay-payment";
import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay-utils";

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
  tradeResult: Record<string, any>,
  meta: {
    ok: boolean;
    stage: string;
    message?: string;
    checkMacValid?: boolean;
  }
) {
  const ip = resolveClientIp(req);
  const ua = req.headers.get("user-agent") || null;

  const tradeAmt = Number(tradeResult.Amt || 0);

  const insertPayload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    provider: "NEWEBPAY",
    ok: meta.ok,
    stage: meta.stage,
    message: meta.message || null,
    check_mac_valid: typeof meta.checkMacValid === "boolean" ? meta.checkMacValid : null,
    merchant_trade_no: tradeResult.MerchantOrderNo || null,
    trade_no: tradeResult.TradeNo || null,
    rtn_code: tradeResult.Status || null,
    trade_amt: Number.isFinite(tradeAmt) ? tradeAmt : null,
    ip,
    user_agent: ua,
    raw: tradeResult,
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
  let tradeResult: Record<string, any> = {};

  try {
    const formData = await req.formData();
    const status = formData.get("Status") as string;
    const merchantID = formData.get("MerchantID") as string;
    const encryptedTradeInfo = formData.get("TradeInfo") as string;
    const receivedTradeSha = formData.get("TradeSha") as string;

    if (!encryptedTradeInfo || !receivedTradeSha) {
      await logWebhookEvent(supabaseAdmin, req, { Status: status }, {
        ok: false,
        stage: "MISSING_FIELDS",
        message: "缺少 TradeInfo 或 TradeSha",
      });
      return new Response("缺少必要欄位", { status: 400 });
    }

    // 驗證 TradeSha
    if (!verifyTradeSha(encryptedTradeInfo, receivedTradeSha)) {
      await logWebhookEvent(supabaseAdmin, req, { Status: status, MerchantID: merchantID }, {
        ok: false,
        stage: "TRADE_SHA_INVALID",
        message: "TradeSha 驗證失敗",
        checkMacValid: false,
      });
      return new Response("TradeSha 驗證失敗", { status: 400 });
    }

    // 解密 TradeInfo
    const decrypted = decryptTradeInfo(encryptedTradeInfo);
    tradeResult = JSON.parse(decrypted);

    // 防重播：同一筆交易已處理成功過，直接回應
    const existingOrderNo = tradeResult.MerchantOrderNo;
    if (existingOrderNo) {
      const { data: existing } = await supabaseAdmin
        .from("payment_webhook_events")
        .select("id")
        .eq("merchant_trade_no", existingOrderNo)
        .eq("ok", true)
        .eq("stage", "SUCCESS")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await logWebhookEvent(supabaseAdmin, req, tradeResult, {
          ok: true,
          stage: "DUPLICATE_IGNORED",
          message: "此交易已成功處理過，忽略重複通知",
          checkMacValid: true,
        });
        return new Response("OK");
      }
    }

    // 檢查付款是否成功
    if (tradeResult.Status !== "SUCCESS") {
      await logWebhookEvent(supabaseAdmin, req, tradeResult, {
        ok: true,
        stage: "STATUS_NOT_SUCCESS",
        message: `Status=${tradeResult.Status || ""}, Message=${tradeResult.Message || ""}`,
        checkMacValid: true,
      });
      return new Response("OK");
    }

    // 解析自訂欄位（OrderComment: "supabaseId|plan|billingCycle"）
    const orderComment = String(tradeResult.OrderComment || "");
    const [supabaseId, planRaw, billingCycleRaw] = orderComment.split("|");
    const plan = String(planRaw || "").toUpperCase() as PlanName;
    const billingCycle = String(billingCycleRaw || "") as BillingCycle;
    const merchantOrderNo = tradeResult.MerchantOrderNo;
    const tradeNo = tradeResult.TradeNo;
    const totalAmount = Number(tradeResult.Amt || 0);

    if (!supabaseId || !merchantOrderNo || !tradeNo) {
      await logWebhookEvent(supabaseAdmin, req, tradeResult, {
        ok: false,
        stage: "VALIDATE_FIELDS",
        message: "缺少必要欄位",
        checkMacValid: true,
      });
      return new Response("缺少必要欄位", { status: 400 });
    }

    // 幂等性檢查：防止重試導致重複處理
    const { data: existingPaid } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("merchantTradeNo", merchantOrderNo)
      .in("status", ["PAID", "SUCCESS"])
      .limit(1);
    if (existingPaid && existingPaid.length > 0) {
      await logWebhookEvent(supabaseAdmin, req, tradeResult, {
        ok: true,
        stage: "IDEMPOTENT_SKIP",
        message: "此訂單已處理過，跳過重複通知",
        checkMacValid: true,
      });
      return new Response("OK");
    }

    if (!["CREATOR", "PRO", "FLAGSHIP"].includes(plan)) {
      await logWebhookEvent(supabaseAdmin, req, tradeResult, {
        ok: false,
        stage: "VALIDATE_PLAN",
        message: "方案錯誤",
        checkMacValid: true,
      });
      return new Response("方案錯誤", { status: 400 });
    }

    if (!["monthly", "quarterly", "biannual", "annual"].includes(billingCycle)) {
      await logWebhookEvent(supabaseAdmin, req, tradeResult, {
        ok: false,
        stage: "VALIDATE_CYCLE",
        message: "週期錯誤",
        checkMacValid: true,
      });
      return new Response("週期錯誤", { status: 400 });
    }

    const result = await processPaidOrder({
      supabaseAdmin,
      supabaseId,
      merchantOrderNo,
      tradeNo,
      plan,
      billingCycle,
      totalAmount,
    });

    if (!result.ok) {
      await logWebhookEvent(supabaseAdmin, req, tradeResult, {
        ok: false,
        stage: result.stage,
        message: result.message,
        checkMacValid: true,
      });
      return new Response(result.message, { status: 400 });
    }

    await logWebhookEvent(supabaseAdmin, req, tradeResult, {
      ok: true,
      stage: result.stage,
      message: result.message,
      checkMacValid: true,
    });
    return new Response("OK");
  } catch (error: any) {
    try {
      await logWebhookEvent(supabaseAdmin, req, tradeResult, {
        ok: false,
        stage: "EXCEPTION",
        message: String(error?.message || "notify failed"),
      });
    } catch {}

    return new Response(error?.message || "notify failed", {
      status: 500,
    });
  }
}
