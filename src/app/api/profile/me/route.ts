import { NextResponse } from "next/server";
import { getUserIdFromRequest, ensurePublicUserBySupabaseId } from "@/lib/usage-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);
    if (!supabaseId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const user = await ensurePublicUserBySupabaseId(supabaseId);
    if (!user) {
      return NextResponse.json({ error: "找不到使用者資料" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        supabaseId: user.supabaseId,
        email: user.email || "",
        name: user.name || "",
        instagramHandle: user.instagramHandle || null,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || "讀取個人資料失敗" },
      { status: 500 }
    );
  }
}
