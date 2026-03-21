import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/usage-checker";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    const { saved } = await req.json();

    const existing = await prisma.viralDatabase.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "找不到資料" }, { status: 404 });
    }

    const updated = await prisma.viralDatabase.update({
      where: {
        id: params.id,
      },
      data: {
        isSaved: Boolean(saved),
        savedAt: saved ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("save viral entry error:", err);

    return NextResponse.json(
      { error: "收藏更新失敗" },
      { status: 500 }
    );
  }
}