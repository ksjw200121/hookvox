import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";
import { buildQueryString, encryptTradeInfo, generateTradeSha } from "@/lib/newebpay-utils";

export const runtime = "nodejs";

type BillingCycle = "monthly" | "quarterly" | "biannual" | "annual";
type PlanName = "CREATOR" | "PRO" | "FLAGSHIP";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function makeMerchantOrderNo(supabaseId: string) {
  const timePart = Date.now().toString().slice(-9);
  const userPart = supabaseId.replace(/-/g, "").slice(0, 5);
  const randomPart = crypto.randomBytes(2).toString("hex");
  return `HV${timePart}${userPart}${randomPart}`.slice(0, 20);
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
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    const body = await req.json();
    const merchantTradeNo = String(body?.merchantTradeNo || "").trim();
    if (!merchantTradeNo) {
      return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("supabaseId", supabaseId)
      .maybeSingle();

    if (userError || !publicUser?.id) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 400 });
    }

    // 確保 subscriptions 列存在
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
        id: crypto.randomUUID(),
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

    const newMerchantOrderNo = makeMerchantOrderNo(supabaseId);
    const nowIso = new Date().toISOString();

    const { error: insertErr } = await supabaseAdmin.from("orders").insert({
      userId: publicUser.id,
      plan,
      billingCycle,
      amount,
      merchantTradeNo: newMerchantOrderNo,
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
      .update({ newebpayMerchantOrderNo: newMerchantOrderNo, updatedAt: nowIso })
      .eq("userId", publicUser.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const notifyUrl = `${appUrl}/api/newebpay/notify`;
    const returnUrl = `${appUrl}/api/newebpay/return`;
    const clientBackUrl = `${appUrl}/billing`;

    const tradeInfoParams: Record<string, string | number> = {
      MerchantID: process.env.NEWEBPAY_MERCHANT_ID!,
      RespondType: "JSON",
      TimeStamp: Math.floor(Date.now() / 1000).toString(),
      Version: "2.0",
      MerchantOrderNo: newMerchantOrderNo,
      Amt: amount,
      ItemDesc: `Hookvox ${getPlanLabel(plan)}-${getCycleLabel(billingCycle)}`,
      Email: publicUser.email || "",
      NotifyURL: notifyUrl,
      ReturnURL: returnUrl,
      ClientBackURL: clientBackUrl,
      CREDIT: 1,
      VACC: 1,
      CVS: 1,
      OrderComment: `${supabaseId}|${plan}|${billingCycle}`,
    };

    const tradeInfoString = buildQueryString(tradeInfoParams);
    const encryptedTradeInfo = encryptTradeInfo(tradeInfoString);
    const tradeSha = generateTradeSha(encryptedTradeInfo);

    const gatewayUrl =
      process.env.NEWEBPAY_GATEWAY_URL ||
      "https://core.newebpay.com/MPG/mpg_gateway";

    const paymentHtml = `
      <form id="newebpay-form" method="post" action="${gatewayUrl}">
        <input type="hidden" name="MerchantID" value="${process.env.NEWEBPAY_MERCHANT_ID!}" />
        <input type="hidden" name="TradeInfo" value="${encryptedTradeInfo}" />
        <input type="hidden" name="TradeSha" value="${tradeSha}" />
        <input type="hidden" name="Version" value="2.0" />
      </form>
    `.trim();

    return NextResponse.json({
      success: true,
      paymentHtml,
      merchantTradeNo: newMerchantOrderNo,
      amount,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("continue-payment error:", err);
    return NextResponse.json(
      { error: "取得付款頁失敗" },
      { status: 500 }
    );
  }
}
