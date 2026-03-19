import { NextResponse } from "next/server";
import { sanitizeApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest, ensurePublicUserBySupabaseId } from "@/lib/usage-checker";

export const runtime = "nodejs";

function normalizeInstagramHandle(input: string) {
  return input.replace(/^@+/, "").trim();
}

export async function POST(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);
    if (!supabaseId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const user = await ensurePublicUserBySupabaseId(supabaseId);
    if (!user?.id) {
      return NextResponse.json({ error: "找不到使用者資料" }, { status: 404 });
    }

    const body = await req.json();
    const instagramHandle = normalizeInstagramHandle(String(body?.instagramHandle || ""));
    const skipped = Boolean(body?.skipped);

    if (!instagramHandle && !skipped) {
      return NextResponse.json({ error: "請輸入 IG 帳號或選擇稍後再填" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        instagramHandle: instagramHandle || null,
      },
      select: {
        id: true,
        supabaseId: true,
        instagramHandle: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error: unknown) {
    console.error("profile/instagram error:", error);
    const sanitized = sanitizeApiError(error, "更新 IG 帳號失敗，請稍後再試");
    return NextResponse.json(
      { error: sanitized.message },
      { status: sanitized.status }
    );
  }
}
