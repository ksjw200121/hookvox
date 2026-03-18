import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest, ensurePublicUserBySupabaseId } from "@/lib/usage-checker";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const PLAN_LEVEL: Record<string, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  FLAGSHIP: 3,
};

function getCycleMonths(cycle: string) {
  const c = String(cycle || "").trim();
  if (c === "monthly") return 1;
  if (c === "quarterly") return 3;
  if (c === "biannual") return 6;
  if (c === "annual") return 12;
  return 1;
}

function addMonths(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function GET(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);

    if (!supabaseId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 新註冊用戶可能尚未有 public.users 列，先同步建立
    const publicUser = await ensurePublicUserBySupabaseId(supabaseId);
    if (!publicUser?.id) {
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
      console.error("[billing] subscription query error:", subError.code, subError.message);
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
      console.error("[billing] orders query error:", ordersError.code, ordersError.message, ordersError.hint);
      return NextResponse.json(
        { error: "讀取訂單失敗", _detail: ordersError.message },
        { status: 500 }
      );
    }
    if (!orders || orders.length === 0) {
      console.error("[billing] orders empty for userId:", publicUser.id, "supabaseUrl:", process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 50));
    }

    let plan = "FREE";
    let status = "FREE";
    let startDate: string | null = null;
    let endDate: string | null = null;

    // 1) Prefer subscriptions table if it indicates a paid plan and is not expired
    if (subscription) {
      plan = String(subscription.plan || "FREE").trim().toUpperCase();
      status = String(subscription.status || "").trim().toUpperCase();
      startDate = subscription.startDate ?? null;
      endDate = subscription.endDate ?? null;
      if (endDate && new Date(endDate) <= new Date()) {
        status = "EXPIRED";
      }
    }

    const isPaidPlan =
      plan === "CREATOR" || plan === "PRO" || plan === "FLAGSHIP";
    const isExplicitlyInactive = status === "EXPIRED" || status === "CANCELLED";

    // 2) Prefer latest PAID/SUCCESS order when it is higher than subscription (upgrade case),
    // or when subscription is missing/invalid.
    const latestPaid = (orders || []).find((o) =>
      ["PAID", "SUCCESS"].includes(String((o as any)?.status || "").toUpperCase())
    );
    const latestPaidPlan = String((latestPaid as any)?.plan || "FREE").trim().toUpperCase();
    const isLatestPaidPlan =
      latestPaidPlan === "CREATOR" || latestPaidPlan === "PRO" || latestPaidPlan === "FLAGSHIP";

    const shouldUsePaidOrder =
      Boolean(latestPaid && isLatestPaidPlan) &&
      ((!isPaidPlan || isExplicitlyInactive) ||
        PLAN_LEVEL[latestPaidPlan] > (PLAN_LEVEL[plan] ?? 0));

    if (shouldUsePaidOrder) {
      plan = latestPaidPlan;
      status = "ACTIVE";
      const anchorIso = (latestPaid as any)?.paidAt || (latestPaid as any)?.createdAt || null;
      const cycle = String((latestPaid as any)?.billingCycle || "monthly");
      const months = getCycleMonths(cycle);
      if (anchorIso) {
        const anchor = new Date(anchorIso);
        if (!Number.isNaN(anchor.getTime())) {
          startDate = anchor.toISOString();
          endDate = addMonths(anchor, months).toISOString();
        }
      }

      // best-effort: self-heal subscription row to avoid future mismatches
      const nowIso = new Date().toISOString();
      if (subscription?.id) {
        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan,
            status: "ACTIVE",
            startDate: startDate || nowIso,
            endDate,
            updatedAt: nowIso,
          })
          .eq("id", subscription.id);
      } else {
        await supabaseAdmin.from("subscriptions").insert({
          id: crypto.randomUUID(),
          userId: publicUser.id,
          plan,
          status: "ACTIVE",
          startDate: startDate || nowIso,
          endDate,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    const url = new URL(req.url);
    const debugMode = url.searchParams.get("debug") === "1";

    return NextResponse.json({
      subscription: {
        plan,
        planLabel: PLAN_LABELS[plan] || plan,
        status,
        startDate,
        endDate,
      },
      ...(debugMode && {
        _debug: {
          supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 40),
          internalUserId: publicUser.id,
          supabaseId,
          ordersCount: (orders || []).length,
          subscriptionRaw: subscription,
        },
      }),
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
