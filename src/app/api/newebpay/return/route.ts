import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  createSupabaseAdmin,
  processPaidOrder,
  type BillingCycle,
  type PlanName,
} from "@/lib/newebpay-payment";
import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay-utils";

export const runtime = "nodejs";

async function logReturnEvent(
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>,
  tradeResult: Record<string, any>,
  stage: string,
  ok: boolean,
  message: string,
  checkMacValid?: boolean
) {
  try {
    const tradeAmt = Number(tradeResult.Amt || 0);
    await supabaseAdmin.from("payment_webhook_events").insert({
      id: crypto.randomUUID(),
      provider: "NEWEBPAY",
      ok,
      stage,
      message,
      check_mac_valid: typeof checkMacValid === "boolean" ? checkMacValid : null,
      merchant_trade_no: tradeResult.MerchantOrderNo || null,
      trade_no: tradeResult.TradeNo || null,
      rtn_code: tradeResult.Status || null,
      trade_amt: Number.isFinite(tradeAmt) ? tradeAmt : null,
      ip: "return_url",
      user_agent: null,
      raw: tradeResult,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Ignore audit failures to avoid breaking redirects
  }
}

async function tryProcessResult(formData: FormData, stage: string) {
  const encryptedTradeInfo = formData.get("TradeInfo") as string;
  const receivedTradeSha = formData.get("TradeSha") as string;
  const supabaseAdmin = createSupabaseAdmin();

  if (!encryptedTradeInfo || !receivedTradeSha) {
    await logReturnEvent(supabaseAdmin, {}, stage, false, "missing TradeInfo or TradeSha");
    return;
  }

  let shaValid = false;
  try {
    shaValid = verifyTradeSha(encryptedTradeInfo, receivedTradeSha);
  } catch (shaErr: any) {
    await logReturnEvent(supabaseAdmin, {}, stage, false, `TradeSha 驗證例外: ${String(shaErr?.message || shaErr)}`, false);
    return;
  }
  if (!shaValid) {
    await logReturnEvent(supabaseAdmin, {}, stage, false, "TradeSha mismatch", false);
    return;
  }

  let decrypted: string;
  try {
    decrypted = decryptTradeInfo(encryptedTradeInfo);
  } catch (decryptErr: any) {
    await logReturnEvent(supabaseAdmin, {}, stage, false, `TradeInfo 解密失敗: ${String(decryptErr?.message || decryptErr)}`, true);
    return;
  }

  let tradeResult: Record<string, any> = {};
  try {
    tradeResult = JSON.parse(decrypted);
  } catch (parseErr: any) {
    await logReturnEvent(supabaseAdmin, {}, stage, false, `JSON 解析失敗: ${String(parseErr?.message || parseErr)}`, true);
    return;
  }

  if (tradeResult.Status !== "SUCCESS") {
    await logReturnEvent(supabaseAdmin, tradeResult, stage, true, `Status=${tradeResult.Status}`, true);
    return;
  }

  const orderComment = String(tradeResult.OrderComment || "");
  const [supabaseId, planRaw, billingCycleRaw] = orderComment.split("|");
  const plan = String(planRaw || "").trim().toUpperCase() as PlanName;
  const billingCycle = String(billingCycleRaw || "").trim() as BillingCycle;

  if (!supabaseId) {
    await logReturnEvent(supabaseAdmin, tradeResult, stage, false, "missing supabaseId", true);
    return;
  }
  if (!["CREATOR", "PRO", "FLAGSHIP"].includes(plan)) {
    await logReturnEvent(supabaseAdmin, tradeResult, stage, false, `invalid plan: ${plan}`, true);
    return;
  }
  if (!["monthly", "quarterly", "biannual", "annual"].includes(billingCycle)) {
    await logReturnEvent(supabaseAdmin, tradeResult, stage, false, `invalid billing cycle: ${billingCycle}`, true);
    return;
  }

  const result = await processPaidOrder({
    supabaseAdmin,
    supabaseId,
    merchantOrderNo: tradeResult.MerchantOrderNo,
    tradeNo: tradeResult.TradeNo,
    plan,
    billingCycle,
    totalAmount: Number(tradeResult.Amt || 0),
  });

  await logReturnEvent(
    supabaseAdmin,
    tradeResult,
    result.stage || stage,
    result.ok,
    result.message,
    true
  );
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    await tryProcessResult(formData, "RETURN_URL_POST");
  } catch {
    // Do not block redirect
  }
  const redirectUrl = new URL("/payment/success", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function GET(req: Request) {
  // 藍新通常用 POST，但保留 GET 以防萬一
  const redirectUrl = new URL("/payment/success", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
