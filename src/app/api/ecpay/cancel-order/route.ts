import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/usage-checker";

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
    const supabaseId = await getUserIdFromRequest(req);
    if (!supabaseId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    const body = await req.json();
    const merchantTradeNo = String(body?.merchantTradeNo || "").trim();
    if (!merchantTradeNo) {
      return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("supabaseId", supabaseId)
      .maybeSingle();

    if (userError || !publicUser?.id) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, userId, status")
      .eq("merchantTradeNo", merchantTradeNo)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
    }
    if (order.userId !== publicUser.id) {
      return NextResponse.json({ error: "此訂單不屬於你" }, { status: 403 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "此訂單已付款或已取消" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "CANCELLED", updatedAt: nowIso })
      .eq("merchantTradeNo", merchantTradeNo)
      .eq("userId", publicUser.id)
      .select("status")
      .single();

    if (updateError || updatedRow?.status !== "CANCELLED") {
      console.error("cancel-order update failed or not applied:", updateError, updatedRow);
      return NextResponse.json(
        { error: "取消訂單未生效，請稍後再試" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("cancel-order error:", err);
    return NextResponse.json(
      { error: err?.message || "取消訂單失敗" },
      { status: 500 }
    );
  }
}
