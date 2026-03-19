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

    const notes = await prisma.adminNote.findMany({
      where: {
        userId: targetUser.id,
      },
      select: {
        id: true,
        note: true,
        noteType: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        authorUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ notes });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin notes list error:", err);
    return NextResponse.json(
      { error: err?.message || "讀取備註失敗" },
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
    const note = String(body?.note || "").trim();
    const noteType = String(body?.noteType || "GENERAL").trim().toUpperCase();
    const isPinned = Boolean(body?.isPinned);
    const reason = String(body?.reason || "").trim();

    if (!note) {
      return NextResponse.json({ error: "請填寫備註內容" }, { status: 400 });
    }

    const created = await prisma.adminNote.create({
      data: {
        userId: targetUser.id,
        authorUserId: adminCheck.user.id,
        note,
        noteType,
        isPinned,
      },
      select: {
        id: true,
        note: true,
        noteType: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await recordAdminAudit({
      actorUserId: adminCheck.user.id,
      targetUserId: targetUser.id,
      entityType: "admin_note",
      entityId: created.id,
      action: "admin.user.create_note",
      reason: reason || note,
      after: created,
    });

    return NextResponse.json({
      success: true,
      note: created,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin create note error:", err);
    return NextResponse.json(
      { error: err?.message || "新增備註失敗" },
      { status: 500 }
    );
  }
}
