import { NextResponse } from "next/server";
import { getAdminUserFromRequest } from "@/lib/admin-auth";
import { isAiEnabled, setAiEnabled } from "@/lib/ai-switch";
import { recordAdminAudit } from "@/lib/admin-audit";

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
      { error: "讀取 AI 狀態失敗" },
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
    const previous = await isAiEnabled();

    const adminUser = user;

    if (!adminUser) {
      return NextResponse.json({ error: "找不到使用者資料" }, { status: 403 });
    }

    await setAiEnabled(enabled);
    await recordAdminAudit({
      actorUserId: adminUser.id,
      targetUserId: adminUser.id,
      entityType: "system_setting",
      entityId: "ai_enabled",
      action: enabled ? "admin.system.enable_ai" : "admin.system.disable_ai",
      before: { enabled: previous },
      after: { enabled },
    });

    return NextResponse.json({
      success: true,
      enabled,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("toggle ai POST error:", err);

    return NextResponse.json(
      { error: "切換 AI 狀態失敗" },
      { status: 500 }
    );
  }
}