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

    const user = await resolveAdminTargetUser(params.supabaseId);

    if (!user) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    const items = await prisma.viralDatabase.findMany({
      where: {
        OR: [{ publicUserId: user.id }, { userId: user.supabaseId }],
      },
      select: {
        id: true,
        videoUrl: true,
        transcript: true,
        analysis: true,
        createdAt: true,
        isSaved: true,
        savedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin user content error:", err);
    return NextResponse.json(
      { error: "讀取使用者內容失敗" },
      { status: 500 }
    );
  }
}
