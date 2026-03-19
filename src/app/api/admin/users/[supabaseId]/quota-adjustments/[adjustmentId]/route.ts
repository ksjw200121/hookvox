import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { resolveAdminTargetUser } from "@/lib/admin-users";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { supabaseId: string; adjustmentId: string } }
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

    const existing = await prisma.manualQuotaAdjustment.findFirst({
      where: {
        id: params.adjustmentId,
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
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "找不到額度調整" }, { status: 404 });
    }

    if (existing.revokedAt) {
      return NextResponse.json({ error: "此調整已撤銷" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason || "").trim();

    const updated = await prisma.manualQuotaAdjustment.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
      },
      select: {
        id: true,
        revokedAt: true,
      },
    });

    await recordAdminAudit({
      actorUserId: adminCheck.user.id,
      targetUserId: targetUser.id,
      entityType: "manual_quota_adjustment",
      entityId: existing.id,
      action: "admin.user.revoke_quota_adjustment",
      reason: reason || null,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ success: true, adjustment: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin revoke quota adjustment error:", err);
    return NextResponse.json(
      { error: err?.message || "撤銷額度調整失敗" },
      { status: 500 }
    );
  }
}
