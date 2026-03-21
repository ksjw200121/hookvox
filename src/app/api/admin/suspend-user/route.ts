import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const adminResult = await assertAdmin(req);

    if (!adminResult.ok) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const body = await req.json();
    const targetSupabaseId = String(body?.supabaseId || "").trim();
    const action = String(body?.action || "").trim();

    if (!targetSupabaseId) {
      return NextResponse.json(
        { error: "缺少 supabaseId" },
        { status: 400 }
      );
    }

    if (action !== "SUSPEND" && action !== "ACTIVATE") {
      return NextResponse.json(
        { error: "action 必須為 SUSPEND 或 ACTIVATE" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { supabaseId: targetSupabaseId },
      select: { id: true, supabaseId: true, accountStatus: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "找不到該使用者" },
        { status: 404 }
      );
    }

    const newStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
    const oldStatus = targetUser.accountStatus;

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { accountStatus: newStatus as any },
    });

    // 寫入 audit log
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: adminResult.user.id,
        targetUserId: targetUser.id,
        entityType: "USER",
        entityId: targetUser.id,
        action: action === "SUSPEND" ? "SUSPEND_USER" : "ACTIVATE_USER",
        reason: String(body?.reason || ""),
        beforeJson: { accountStatus: oldStatus },
        afterJson: { accountStatus: newStatus },
      },
    });

    return NextResponse.json({
      success: true,
      supabaseId: targetSupabaseId,
      accountStatus: newStatus,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("suspend-user error:", err);
    return NextResponse.json(
      { error: "操作失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
