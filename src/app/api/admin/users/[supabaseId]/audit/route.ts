import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
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

    const logs = await prisma.adminAuditLog.findMany({
      where: {
        targetUserId: targetUser.id,
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        reason: true,
        beforeJson: true,
        afterJson: true,
        metaJson: true,
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
      take: 50,
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin audit route error:", err);
    return NextResponse.json(
      { error: err?.message || "讀取審計紀錄失敗" },
      { status: 500 }
    );
  }
}
