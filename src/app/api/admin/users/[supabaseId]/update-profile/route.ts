import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { resolveAdminTargetUser } from "@/lib/admin-users";

export const runtime = "nodejs";

function normalizeInstagramHandle(input: string) {
  return input.replace(/^@+/, "").trim();
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
    const nextRole = String(body?.role || targetUser.role || "USER")
      .trim()
      .toUpperCase();
    const nextAccountStatus = String(
      body?.accountStatus || targetUser.accountStatus || "ACTIVE"
    )
      .trim()
      .toUpperCase();
    const nextInstagramHandle = normalizeInstagramHandle(
      String(body?.instagramHandle || "")
    );
    const nextInternalNoteSummary = String(body?.internalNoteSummary || "").trim();
    const reason = String(body?.reason || "").trim();

    if (!["USER", "ADMIN"].includes(nextRole)) {
      return NextResponse.json({ error: "role 無效" }, { status: 400 });
    }

    if (!["ACTIVE", "SUSPENDED"].includes(nextAccountStatus)) {
      return NextResponse.json({ error: "accountStatus 無效" }, { status: 400 });
    }

    const before = {
      role: targetUser.role,
      accountStatus: String(targetUser.accountStatus || "ACTIVE"),
      instagramHandle: targetUser.instagramHandle,
      internalNoteSummary: targetUser.internalNoteSummary,
    };

    const updated = await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        role: nextRole,
        accountStatus: nextAccountStatus as any,
        instagramHandle: nextInstagramHandle || null,
        internalNoteSummary: nextInternalNoteSummary || null,
      },
      select: {
        id: true,
        supabaseId: true,
        role: true,
        accountStatus: true,
        instagramHandle: true,
        internalNoteSummary: true,
      },
    });

    await recordAdminAudit({
      actorUserId: adminCheck.user.id,
      targetUserId: targetUser.id,
      entityType: "user_profile",
      entityId: targetUser.id,
      action: "admin.user.update_profile",
      reason: reason || null,
      before,
      after: updated,
    });

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin update profile error:", err);
    return NextResponse.json(
      { error: err?.message || "更新使用者資料失敗" },
      { status: 500 }
    );
  }
}
