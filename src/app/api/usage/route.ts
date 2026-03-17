import { NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  getUsageSnapshotForSupabaseId,
  ensurePublicUserBySupabaseId,
} from "@/lib/usage-checker";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1";

    const snapshot = await getUsageSnapshotForSupabaseId(userId);

    if (!debug) {
      return NextResponse.json({
        ...snapshot,
        version: "usage-snapshot-v3",
        commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      });
    }

    // debug-only: show how we resolved internal user and what subscription query returns
    const supabaseAdmin = getSupabaseAdmin();
    const publicUser = await ensurePublicUserBySupabaseId(userId);
    const internalUserId = publicUser?.id || null;
    const { data: sub, error: subErr } = internalUserId
      ? await supabaseAdmin
          .from("subscriptions")
          .select("id, userId, plan, status, startDate, endDate, updatedAt")
          .eq("userId", internalUserId)
          .maybeSingle()
      : { data: null, error: null };

    return NextResponse.json({
      ...snapshot,
      version: "usage-snapshot-v3",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      _debug: {
        supabaseId: userId,
        internalUserId,
        subscription: sub,
        subscriptionError: subErr ? { message: subErr.message, code: (subErr as any).code } : null,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("usage api error:", err);
    return NextResponse.json({
      plan: "FREE",
      usage: {
        analyze: { used: 0, limit: 3, remaining: 3, cycleStart: null, cycleEnd: null },
        generate: { used: 0, limit: 3, remaining: 3, cycleStart: null, cycleEnd: null },
        week: { analyze: 0, generate: 0 },
      },
      _error: err?.message || "伺服器錯誤",
      version: "usage-snapshot-v3",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    });
  }
}