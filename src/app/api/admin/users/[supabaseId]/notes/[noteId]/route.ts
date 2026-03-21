import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { resolveAdminTargetUser } from "@/lib/admin-users";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: { supabaseId: string; noteId: string } }
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

    const existing = await prisma.adminNote.findFirst({
      where: {
        id: params.noteId,
        userId: targetUser.id,
      },
      select: {
        id: true,
        note: true,
        noteType: true,
        isPinned: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "找不到備註" }, { status: 404 });
    }

    const body = await req.json();
    const note = String(body?.note || existing.note).trim();
    const noteType = String(body?.noteType || existing.noteType).trim().toUpperCase();
    const isPinned =
      typeof body?.isPinned === "boolean" ? Boolean(body.isPinned) : existing.isPinned;
    const reason = String(body?.reason || "").trim();

    if (!note) {
      return NextResponse.json({ error: "備註不可為空" }, { status: 400 });
    }

    const updated = await prisma.adminNote.update({
      where: { id: existing.id },
      data: {
        note,
        noteType,
        isPinned,
      },
      select: {
        id: true,
        note: true,
        noteType: true,
        isPinned: true,
        updatedAt: true,
      },
    });

    await recordAdminAudit({
      actorUserId: adminCheck.user.id,
      targetUserId: targetUser.id,
      entityType: "admin_note",
      entityId: existing.id,
      action: "admin.user.update_note",
      reason: reason || null,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ success: true, note: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin update note error:", err);
    return NextResponse.json(
      { error: "更新備註失敗" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { supabaseId: string; noteId: string } }
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

    const existing = await prisma.adminNote.findFirst({
      where: {
        id: params.noteId,
        userId: targetUser.id,
      },
      select: {
        id: true,
        note: true,
        noteType: true,
        isPinned: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "找不到備註" }, { status: 404 });
    }

    await prisma.adminNote.delete({
      where: { id: existing.id },
    });

    await recordAdminAudit({
      actorUserId: adminCheck.user.id,
      targetUserId: targetUser.id,
      entityType: "admin_note",
      entityId: existing.id,
      action: "admin.user.delete_note",
      before: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin delete note error:", err);
    return NextResponse.json(
      { error: "刪除備註失敗" },
      { status: 500 }
    );
  }
}
