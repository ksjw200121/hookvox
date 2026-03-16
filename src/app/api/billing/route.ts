import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "免費方案",
  CREATOR: "Creator 方案",
  PRO: "專業版方案",
  FLAGSHIP: "旗艦版方案",
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: "月繳",
  quarterly: "季繳",
  biannual: "半年繳",
  annual: "年繳",
};

export async function GET(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);

    if (!supabaseId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("supabaseId", supabaseId)
      .maybeSingle();

    if (userError || !publicUser?.id) {
      return NextResponse.json(
        { error: "找不到使用者資料" },
        { status: 400 }
      );
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan, status, startDate, endDate")
      .eq("userId", publicUser.id)
      .maybeSingle();

    if (subError) {
      return NextResponse.json(
        { error: "讀取訂閱失敗" },
        { status: 500 }
      );
    }

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, plan, billingCycle, amount, status, createdAt, paidAt, merchantTradeNo")
      .eq("userId", publicUser.id)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (ordersError) {
      return NextResponse.json(
        { error: "讀取訂單失敗" },
        { status: 500 }
      );
    }

    let plan = "FREE";
    let status = "FREE";
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (subscription) {
      plan = String(subscription.plan || "FREE").toUpperCase();
      status = String(subscription.status || "");
      startDate = subscription.startDate ?? null;
      endDate = subscription.endDate ?? null;
      if (endDate && new Date(endDate) <= new Date()) {
        status = "EXPIRED";
      }
    }

    return NextResponse.json({
      subscription: {
        plan,
        planLabel: PLAN_LABELS[plan] || plan,
        status,
        startDate,
        endDate,
      },
      orders: (orders || []).map((o) => ({
        id: o.id,
        plan: o.plan,
        planLabel: PLAN_LABELS[String(o.plan).toUpperCase()] || o.plan,
        billingCycle: o.billingCycle,
        cycleLabel: CYCLE_LABELS[String(o.billingCycle)] || o.billingCycle,
        amount: Number(o.amount),
        status: o.status,
        createdAt: o.createdAt,
        paidAt: o.paidAt ?? null,
        merchantTradeNo: o.merchantTradeNo ?? null,
      })),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("billing api error:", err);
    return NextResponse.json(
      { error: err?.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}
