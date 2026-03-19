import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { resolveAdminTargetUser } from "@/lib/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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

    const adjustments = await prisma.manualQuotaAdjustment.findMany({
      where: {
        userId: targetUser.id,
      },
      select: {
        id: true,
        feature: true,
        delta: true,
        reason: true,
        effectiveFrom: true,
        effectiveTo: true,
        revokedAt: true,
        createdAt: true,
        actorUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ adjustments });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin quota adjustments list error:", err);
    return NextResponse.json(
      { error: err?.message || "讀取額度調整失敗" },
      { status: 500 }
    );
  }
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
    const feature = String(body?.feature || "").trim().toUpperCase();
    const delta = Number(body?.delta || 0);
    const reason = String(body?.reason || "").trim();
    const effectiveFrom = body?.effectiveFrom ? new Date(body.effectiveFrom) : new Date();
    const effectiveTo = body?.effectiveTo ? new Date(body.effectiveTo) : null;

    if (!["ANALYZE", "GENERATE"].includes(feature)) {
      return NextResponse.json({ error: "feature 無效" }, { status: 400 });
    }

    if (!Number.isInteger(delta) || delta === 0) {
      return NextResponse.json(
        { error: "delta 需為非 0 的整數" },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json({ error: "請填寫調整原因" }, { status: 400 });
    }

    if (effectiveTo && effectiveTo <= effectiveFrom) {
      return NextResponse.json(
        { error: "結束時間必須晚於開始時間" },
        { status: 400 }
      );
    }

    const created = await prisma.manualQuotaAdjustment.create({
      data: {
        userId: targetUser.id,
        actorUserId: adminCheck.user.id,
        feature: feature as any,
        delta,
        reason,
        effectiveFrom,
        effectiveTo,
      },
      select: {
        id: true,
        feature: true,
        delta: true,
        reason: true,
        effectiveFrom: true,
        effectiveTo: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    await recordAdminAudit({
      actorUserId: adminCheck.user.id,
      targetUserId: targetUser.id,
      entityType: "manual_quota_adjustment",
      entityId: created.id,
      action: "admin.user.create_quota_adjustment",
      reason,
      after: created,
    });

    return NextResponse.json({ success: true, adjustment: created });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin create quota adjustment error:", err);
    return NextResponse.json(
      { error: err?.message || "新增額度調整失敗" },
      { status: 500 }
    );
  }
}
