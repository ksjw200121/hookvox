import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PlanName = "CREATOR" | "PRO" | "FLAGSHIP";
type BillingCycle = "monthly" | "quarterly" | "biannual" | "annual";

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

function getCycleMonths(cycle: BillingCycle) {
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

async function tryProcessEcpayResult(body: Record<string, string>, stage: string) {
  // Validate required fields
  const merchantTradeNo = body.MerchantTradeNo || "";
  const tradeNo = body.TradeNo || "";
  const rtnCode = body.RtnCode || "";
  const tradeAmt = Number(body.TradeAmt || 0);

  if (!merchantTradeNo || !tradeNo || !rtnCode) return;

  const received = body.CheckMacValue || "";
  const expected = generateCheckMacValue(body);
  if (!received || received !== expected) return;

  if (rtnCode !== "1") return;

  const supabaseId = String(body.CustomField1 || "").trim();
  const plan = String(body.CustomField2 || "").trim().toUpperCase() as PlanName;
  const billingCycle = String(body.CustomField3 || "").trim() as BillingCycle;

  if (!supabaseId) return;
  if (!["CREATOR", "PRO", "FLAGSHIP"].includes(plan)) return;
  if (!["monthly", "quarterly", "biannual", "annual"].includes(billingCycle)) return;

  const supabaseAdmin = getSupabaseAdmin();

  // best-effort audit log (do not block)
  try {
    await supabaseAdmin.from("payment_webhook_events").insert({
      id: crypto.randomUUID(),
      provider: "ECPAY",
      ok: true,
      stage,
      message: "OrderResultURL received",
      check_mac_valid: true,
      merchant_trade_no: merchantTradeNo,
      trade_no: tradeNo,
      rtn_code: rtnCode,
      trade_amt: Number.isFinite(tradeAmt) ? tradeAmt : null,
      ip: "order_result_url",
      user_agent: null,
      raw: body,
      created_at: new Date().toISOString(),
    });
  } catch {
    // ignore
  }

  const { data: publicUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("supabaseId", supabaseId)
    .maybeSingle();
  if (!publicUser?.id) return;

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, userId, plan, billingCycle, amount, status, createdAt")
    .eq("merchantTradeNo", merchantTradeNo)
    .maybeSingle();
  if (!order?.id) return;
  if (order.userId !== publicUser.id) return;
  if (String(order.plan).toUpperCase() !== plan) return;
  if (String(order.billingCycle) !== billingCycle) return;
  if (Number(order.amount) !== tradeAmt) return;

  // Idempotent: if already paid, nothing to do
  if (String(order.status).toUpperCase() === "PAID") return;

  const now = new Date();
  const nowIso = now.toISOString();

  // ensure subscription row exists
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, endDate, status")
    .eq("userId", publicUser.id)
    .maybeSingle();

  const months = getCycleMonths(billingCycle);
  const startDate = nowIso;
  const endDate = addMonths(now, months).toISOString();

  if (sub?.id) {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        plan,
        status: "ACTIVE",
        ecpayTradeNo: tradeNo,
        ecpayMerchantTradeNo: merchantTradeNo,
        startDate,
        endDate,
        updatedAt: nowIso,
      })
      .eq("id", sub.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert({
      id: crypto.randomUUID(),
      userId: publicUser.id,
      plan,
      status: "ACTIVE",
      ecpayTradeNo: tradeNo,
      ecpayMerchantTradeNo: merchantTradeNo,
      startDate,
      endDate,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  await supabaseAdmin
    .from("orders")
    .update({ status: "PAID", tradeNo, paidAt: nowIso, updatedAt: nowIso })
    .eq("id", order.id);
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
    for (const [k, v] of searchParams.entries()) body[k] = v;
    await tryProcessEcpayResult(body, "ORDER_RESULT_URL_GET");
  } catch {
    // ignore
  }
  const redirectUrl = new URL("/payment/success", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}