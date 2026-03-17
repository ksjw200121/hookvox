import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";

export const runtime = "nodejs";

type BillingCycle = "monthly" | "quarterly" | "biannual" | "annual";
type PlanName = "CREATOR" | "PRO" | "FLAGSHIP";

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

function makeMerchantTradeNo(supabaseId: string) {
  const timePart = Date.now().toString().slice(-9);
  const userPart = supabaseId.replace(/-/g, "").slice(0, 5);
  const randomPart = crypto.randomBytes(2).toString("hex");
  return `HV${timePart}${userPart}${randomPart}`.slice(0, 20);
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
    const merchantTradeNo = String(body?.merchantTradeNo || "").trim();
    if (!merchantTradeNo) {
      return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("supabaseId", supabaseId)
      .maybeSingle();

    if (userError || !publicUser?.id) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 400 });
    }

    // 新註冊用戶可能還沒有 subscriptions 列：先補一列，避免 webhook 因找不到訂閱而無法入帳
    const { data: subRow, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("userId", publicUser.id)
      .maybeSingle();
    if (subErr) {
      return NextResponse.json({ error: `讀取訂閱失敗: ${subErr.message}` }, { status: 500 });
    }
    if (!subRow?.id) {
      const nowIso = new Date().toISOString();
      const { error: insertSubErr } = await supabaseAdmin.from("subscriptions").insert({
        userId: publicUser.id,
        plan: "FREE",
        status: "ACTIVE",
        startDate: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (insertSubErr) {
        return NextResponse.json(
          { error: `建立訂閱失敗: ${insertSubErr.message}` },
          { status: 500 }
        );
      }
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, userId, plan, billingCycle, amount, merchantTradeNo, status")
      .eq("merchantTradeNo", merchantTradeNo)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
    }
    if (order.userId !== publicUser.id) {
      return NextResponse.json({ error: "此訂單不屬於你" }, { status: 403 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "此訂單已付款或已失效" }, { status: 400 });
    }

    const plan = String(order.plan).toUpperCase() as PlanName;
    const billingCycle = String(order.billingCycle) as BillingCycle;
    const amount = Number(order.amount);

    const newMerchantTradeNo = makeMerchantTradeNo(supabaseId);
    const nowIso = new Date().toISOString();

    const { error: insertErr } = await supabaseAdmin.from("orders").insert({
      userId: publicUser.id,
      plan,
      billingCycle,
      amount,
      merchantTradeNo: newMerchantTradeNo,
      status: "PENDING",
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (insertErr) {
      return NextResponse.json(
        { error: "建立新付款單失敗，請稍後再試" },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "CANCELLED", updatedAt: nowIso })
      .eq("merchantTradeNo", merchantTradeNo);

    await supabaseAdmin
      .from("subscriptions")
      .update({ ecpayMerchantTradeNo: newMerchantTradeNo, updatedAt: nowIso })
      .eq("userId", publicUser.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const notifyUrl = process.env.ECPAY_NOTIFY_URL || `${appUrl}/api/ecpay/notify`;
    const resultUrl = `${appUrl}/api/ecpay/return`;
    const clientBackUrl = process.env.ECPAY_RETURN_URL || `${appUrl}/billing`;

    const params: Record<string, string> = {
      MerchantID: process.env.ECPAY_MERCHANT_ID!,
      MerchantTradeNo: newMerchantTradeNo,
      MerchantTradeDate: getTradeDate(),
      PaymentType: "aio",
      TotalAmount: String(amount),
      TradeDesc: "Hookvox 訂閱升級",
      ItemName: `${getPlanLabel(plan)}-${getCycleLabel(billingCycle)}`,
      ReturnURL: notifyUrl,
      ChoosePayment: "ALL",
      ClientBackURL: clientBackUrl,
      OrderResultURL: resultUrl,
      NeedExtraPaidInfo: "Y",
      EncryptType: "1",
      CustomField1: supabaseId,
      CustomField2: plan,
      CustomField3: billingCycle,
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
      merchantTradeNo: newMerchantTradeNo,
      amount,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("continue-payment error:", err);
    return NextResponse.json(
      { error: err?.message || "取得付款頁失敗" },
      { status: 500 }
    );
  }
}
