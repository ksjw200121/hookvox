import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { getAdminUserSummary } from "@/lib/admin-users";

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

    const summary = await getAdminUserSummary(params.supabaseId);

    if (!summary) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin user summary error:", err);
    return NextResponse.json(
      { error: err?.message || "讀取使用者詳情失敗" },
      { status: 500 }
    );
  }
}
