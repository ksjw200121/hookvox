import { NextResponse } from "next/server";
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

async function logOrderResultEvent(
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>,
  body: Record<string, string>,
  stage: string,
  ok: boolean,
  message: string,
  checkMacValid?: boolean
) {
  try {
    const tradeAmt = Number(body.TradeAmt || 0);
    await supabaseAdmin.from("payment_webhook_events").insert({
      id: crypto.randomUUID(),
      provider: "ECPAY",
      ok,
      stage,
      message,
      check_mac_valid: typeof checkMacValid === "boolean" ? checkMacValid : null,
      merchant_trade_no: body.MerchantTradeNo || null,
      trade_no: body.TradeNo || null,
      rtn_code: body.RtnCode || null,
      trade_amt: Number.isFinite(tradeAmt) ? tradeAmt : null,
      ip: "order_result_url",
      user_agent: null,
      raw: body,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Ignore audit failures to avoid breaking redirects
  }
}

async function tryProcessEcpayResult(body: Record<string, string>, stage: string) {
  // Validate required fields
  const merchantTradeNo = body.MerchantTradeNo || "";
  const tradeNo = body.TradeNo || "";
  const rtnCode = body.RtnCode || "";
  const tradeAmt = Number(body.TradeAmt || 0);
  const supabaseAdmin = createSupabaseAdmin();

  if (!merchantTradeNo || !tradeNo || !rtnCode) {
    await logOrderResultEvent(supabaseAdmin, body, stage, false, "missing required fields");
    return;
  }

  const received = body.CheckMacValue || "";
  const expected = generateCheckMacValue(body);
  if (!received || received !== expected) {
    await logOrderResultEvent(supabaseAdmin, body, stage, false, "CheckMacValue mismatch", false);
    return;
  }

  if (rtnCode !== "1") {
    await logOrderResultEvent(supabaseAdmin, body, stage, true, `RtnCode=${rtnCode}`, true);
    return;
  }

  const supabaseId = String(body.CustomField1 || "").trim();
  const plan = String(body.CustomField2 || "").trim().toUpperCase() as EcpayPlanName;
  const billingCycle = String(body.CustomField3 || "").trim() as EcpayBillingCycle;

  if (!supabaseId) {
    await logOrderResultEvent(supabaseAdmin, body, stage, false, "missing supabaseId", true);
    return;
  }
  if (!["CREATOR", "PRO", "FLAGSHIP"].includes(plan)) {
    await logOrderResultEvent(supabaseAdmin, body, stage, false, `invalid plan: ${plan}`, true);
    return;
  }
  if (!["monthly", "quarterly", "biannual", "annual"].includes(billingCycle)) {
    await logOrderResultEvent(supabaseAdmin, body, stage, false, `invalid billing cycle: ${billingCycle}`, true);
    return;
  }

  const result = await processPaidEcpayOrder({
    supabaseAdmin,
    supabaseId,
    merchantTradeNo,
    tradeNo,
    plan,
    billingCycle,
    totalAmount: tradeAmt,
  });

  await logOrderResultEvent(
    supabaseAdmin,
    body,
    result.stage || stage,
    result.ok,
    result.message,
    true
  );
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const body = Object.fromEntries(formData.entries()) as Record<string, string>;
    await tryProcessEcpayResult(body, "ORDER_RESULT_URL_POST");
  } catch {
    // Do not block redirect
  }
  const redirectUrl = new URL("/payment/success", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      body[key] = value;
    });
    await tryProcessEcpayResult(body, "ORDER_RESULT_URL_GET");
  } catch {
    // ignore
  }
  const redirectUrl = new URL("/payment/success", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}