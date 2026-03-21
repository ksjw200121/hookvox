import { NextResponse } from "next/server";
import { getAdminUserFromRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { supabaseUserId, user } = await getAdminUserFromRequest(req);

    if (!supabaseUserId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    return NextResponse.json({
      loggedIn: true,
      supabaseUserId,
      role: user?.role || "USER",
      isAdmin: String(user?.role || "").toUpperCase() === "ADMIN",
      user: {
        email: user?.email || "",
        name: user?.name || "",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin me route error:", err);

    return NextResponse.json(
      { error: "讀取 admin 狀態失敗" },
      { status: 500 }
    );
  }
}