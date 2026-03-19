import { NextResponse } from "next/server";
import { sanitizeApiError } from "@/lib/api-error";
import { getUserIdFromRequest, ensurePublicUserBySupabaseId } from "@/lib/usage-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabaseId = await getUserIdFromRequest(req);
    if (!supabaseId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
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
    console.error("profile/me error:", error);
    const sanitized = sanitizeApiError(error, "讀取個人資料失敗，請稍後再試");
    return NextResponse.json(
      { error: sanitized.message },
      { status: sanitized.status }
    );
  }
}
