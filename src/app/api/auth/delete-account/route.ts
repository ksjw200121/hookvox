import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabaseUserId = await getUserIdFromRequest(req);

    if (!supabaseUserId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await req.json();
    const password = String(body?.password || "").trim();

    if (!password) {
      return NextResponse.json(
        { error: "請輸入密碼以確認刪除" },
        { status: 400 }
      );
    }

    // Look up the user's email
    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUserId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "找不到使用者資料" },
        { status: 404 }
      );
    }

    // Verify password by signing in
    const supabaseAdmin = getSupabaseAdmin();
    const { error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password,
      });

    if (signInError) {
      return NextResponse.json(
        { error: "密碼錯誤，請確認後再試" },
        { status: 403 }
      );
    }

    // Delete all Prisma data for this user (cascade will handle most relations)
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Delete auth user from Supabase
    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
      // Data is already deleted from Prisma, so we still return success
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("delete-account error:", err);
    return NextResponse.json(
      { error: "刪除帳號失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
