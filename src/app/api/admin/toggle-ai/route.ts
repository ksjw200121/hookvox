import { NextResponse } from "next/server";
import { getAdminUserFromRequest } from "@/lib/admin-auth";
import { isAiEnabled, setAiEnabled } from "@/lib/ai-switch";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { supabaseUserId, user } = await getAdminUserFromRequest(req);

    if (!supabaseUserId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "沒有權限" }, { status: 403 });
    }

    const enabled = await isAiEnabled();

    return NextResponse.json({
      success: true,
      enabled,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("toggle ai GET error:", err);

    return NextResponse.json(
      { error: err?.message || "讀取 AI 狀態失敗" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { supabaseUserId, user } = await getAdminUserFromRequest(req);

    if (!supabaseUserId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "沒有權限" }, { status: 403 });
    }

    const body = await req.json();
    const enabled = Boolean(body?.enabled);

    await setAiEnabled(enabled);

    return NextResponse.json({
      success: true,
      enabled,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("toggle ai POST error:", err);

    return NextResponse.json(
      { error: err?.message || "切換 AI 狀態失敗" },
      { status: 500 }
    );
  }
}