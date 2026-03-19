import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { resolveAdminTargetUser } from "@/lib/admin-users";

export const runtime = "nodejs";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getCycleMonths(cycle?: string | null) {
  if (cycle === "quarterly") return 3;
  if (cycle === "biannual") return 6;
  if (cycle === "annual") return 12;
  return 1;
}

function normalizePlan(input?: string | null) {
  const plan = String(input || "FREE").trim().toUpperCase();
  if (plan === "CREATOR" || plan === "PRO" || plan === "FLAGSHIP") {
    return plan;
  }
  return "FREE";
}

export async function POST(
  req: Request,
  { params }: { params: { supabaseId: string } }
) {
  try {
    const adminCheck = await assertAdmin(req);

    if (!adminCheck.ok) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const targetUser = await resolveAdminTargetUser(params.supabaseId);

    if (!targetUser) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    const body = await req.json();
    const action = String(body?.action || "").trim();
    const reason = String(body?.reason || "").trim();

    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId: targetUser.id,
      },
      select: {
        id: true,
        plan: true,
        status: true,
        startDate: true,
        endDate: true,
        ecpayTradeNo: true,
        ecpayMerchantTradeNo: true,
      },
    });

    if (action === "sync_latest_paid_order") {
      const latestPaidOrder = await prisma.order.findFirst({
        where: {
          userId: targetUser.id,
          status: {
            in: ["PAID", "SUCCESS"],
          },
        },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          plan: true,
          billingCycle: true,
          tradeNo: true,
          merchantTradeNo: true,
          paidAt: true,
          createdAt: true,
          status: true,
        },
      });

      if (!latestPaidOrder) {
        return NextResponse.json(
          { error: "找不到最近已付款訂單" },
          { status: 400 }
        );
      }

      const startDate = latestPaidOrder.paidAt || latestPaidOrder.createdAt;
      const endDate = addMonths(startDate, getCycleMonths(latestPaidOrder.billingCycle));
      const paidOrderPlan = normalizePlan(latestPaidOrder.plan);

      const updated = await prisma.subscription.upsert({
        where: {
          userId: targetUser.id,
        },
        update: {
          plan: paidOrderPlan as any,
          status: "ACTIVE",
          startDate,
          endDate,
          ecpayTradeNo: latestPaidOrder.tradeNo,
          ecpayMerchantTradeNo: latestPaidOrder.merchantTradeNo,
        },
        create: {
          userId: targetUser.id,
          plan: paidOrderPlan as any,
          status: "ACTIVE",
          startDate,
          endDate,
          ecpayTradeNo: latestPaidOrder.tradeNo,
          ecpayMerchantTradeNo: latestPaidOrder.merchantTradeNo,
        },
        select: {
          id: true,
          plan: true,
          status: true,
          startDate: true,
          endDate: true,
          ecpayTradeNo: true,
          ecpayMerchantTradeNo: true,
        },
      });

      await recordAdminAudit({
        actorUserId: adminCheck.user.id,
        targetUserId: targetUser.id,
        entityType: "subscription",
        entityId: updated.id,
        action: "admin.user.sync_latest_paid_order",
        reason: reason || null,
        before: existingSubscription,
        after: {
          ...updated,
          sourceOrderId: latestPaidOrder.id,
        },
      });

      return NextResponse.json({ success: true, subscription: updated });
    }

    if (action === "set_free_expired") {
      const activePaidOrder = await prisma.order.findFirst({
        where: {
          userId: targetUser.id,
          status: {
            in: ["PAID", "SUCCESS"],
          },
        },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          plan: true,
          billingCycle: true,
          paidAt: true,
          createdAt: true,
        },
      });

      const updated = await prisma.subscription.upsert({
        where: {
          userId: targetUser.id,
        },
        update: {
          plan: "FREE",
          status: "EXPIRED",
          startDate: existingSubscription?.startDate || new Date(),
          endDate: new Date(),
          ecpayTradeNo: null,
          ecpayMerchantTradeNo: null,
        },
        create: {
          userId: targetUser.id,
          plan: "FREE",
          status: "EXPIRED",
          startDate: new Date(),
          endDate: new Date(),
        },
        select: {
          id: true,
          plan: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      });

      const warning =
        activePaidOrder &&
        addMonths(
          activePaidOrder.paidAt || activePaidOrder.createdAt,
          getCycleMonths(activePaidOrder.billingCycle)
        ) > new Date()
          ? "此帳號仍有未過期的已付款訂單，前台讀取時可能再次被同步回付費狀態。"
          : null;

      await recordAdminAudit({
        actorUserId: adminCheck.user.id,
        targetUserId: targetUser.id,
        entityType: "subscription",
        entityId: updated.id,
        action: "admin.user.set_free_expired",
        reason: reason || null,
        before: existingSubscription,
        after: updated,
        meta: warning ? { warning } : null,
      });

      return NextResponse.json({ success: true, subscription: updated, warning });
    }

    if (action === "replace_subscription_window") {
      const plan = String(body?.plan || "FREE").trim().toUpperCase();
      const status = String(body?.status || "ACTIVE").trim().toUpperCase();
      const billingCycle = String(body?.billingCycle || "monthly").trim();
      const startDate = body?.startDate ? new Date(body.startDate) : new Date();
      const endDate = body?.endDate
        ? new Date(body.endDate)
        : plan === "FREE"
          ? new Date()
          : addMonths(startDate, getCycleMonths(billingCycle));

      if (!["FREE", "CREATOR", "PRO", "FLAGSHIP"].includes(plan)) {
        return NextResponse.json({ error: "plan 無效" }, { status: 400 });
      }

      if (!["ACTIVE", "CANCELLED", "EXPIRED"].includes(status)) {
        return NextResponse.json({ error: "status 無效" }, { status: 400 });
      }

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return NextResponse.json({ error: "日期格式無效" }, { status: 400 });
      }

      if (endDate < startDate) {
        return NextResponse.json(
          { error: "endDate 不能早於 startDate" },
          { status: 400 }
        );
      }

      const updated = await prisma.subscription.upsert({
        where: {
          userId: targetUser.id,
        },
        update: {
          plan: plan as any,
          status: status as any,
          startDate,
          endDate,
        },
        create: {
          userId: targetUser.id,
          plan: plan as any,
          status: status as any,
          startDate,
          endDate,
        },
        select: {
          id: true,
          plan: true,
          status: true,
          startDate: true,
          endDate: true,
          ecpayTradeNo: true,
          ecpayMerchantTradeNo: true,
        },
      });

      await recordAdminAudit({
        actorUserId: adminCheck.user.id,
        targetUserId: targetUser.id,
        entityType: "subscription",
        entityId: updated.id,
        action: "admin.user.replace_subscription_window",
        reason: reason || null,
        before: existingSubscription,
        after: {
          ...updated,
          billingCycle,
        },
      });

      return NextResponse.json({ success: true, subscription: updated });
    }

    return NextResponse.json({ error: "不支援的操作" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin subscription tools error:", err);
    return NextResponse.json(
      { error: err?.message || "處理訂閱工具失敗" },
      { status: 500 }
    );
  }
}
