import { NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  ensurePublicUserBySupabaseId,
} from "@/lib/usage-checker";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanName = "FREE" | "CREATOR" | "PRO" | "FLAGSHIP";

const LIMITS: Record<PlanName, { analyze: number; generate: number }> = {
  FREE: { analyze: 3, generate: 3 },
  CREATOR: { analyze: 50, generate: 50 },
  PRO: { analyze: 200, generate: 200 },
  FLAGSHIP: { analyze: 500, generate: 500 },
};

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

function getCurrentCycleWindow(anchorInput?: string | null): {
  cycleStart: string;
  cycleEnd: string;
} {
  const now = new Date();
  let cycleStart = anchorInput ? new Date(anchorInput) : new Date();

  if (Number.isNaN(cycleStart.getTime())) {
    cycleStart = new Date();
  }

  let cycleEnd = addOneMonth(cycleStart);

  while (now >= cycleEnd) {
    cycleStart = cycleEnd;
    cycleEnd = addOneMonth(cycleStart);
  }

  return {
    cycleStart: cycleStart.toISOString(),
    cycleEnd: cycleEnd.toISOString(),
  };
}

function getActionGroup(action: string): "ANALYZE" | "GENERATE" | null {
  if (action === "ANALYZE") return "ANALYZE";
  if (
    action === "GENERATE" ||
    action === "GENERATE_SCRIPT" ||
    action === "GENERATE_TITLES" ||
    action === "GENERATE_IDEAS"
  ) {
    return "GENERATE";
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 與 billing API 同源：先把 Supabase auth user 對齊 public.users，再用 internal userId 查 subscriptions
    const publicUser = await ensurePublicUserBySupabaseId(userId);
    const internalUserId = publicUser?.id;

    let subscription: SubscriptionRow | null = null;
    if (internalUserId) {
      const supabaseAdmin = getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status, startDate, endDate")
        .eq("userId", internalUserId)
        .maybeSingle();
      subscription = (data as SubscriptionRow) ?? null;
    }

    const status = String(subscription?.status || "").trim().toUpperCase();
    const planRaw = String(subscription?.plan || "FREE").trim().toUpperCase();
    const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
    const isExpired =
      endDate && !Number.isNaN(endDate.getTime()) && endDate <= new Date();

    const plan: PlanName =
      !isExpired &&
      status === "ACTIVE" &&
      (planRaw === "CREATOR" || planRaw === "PRO" || planRaw === "FLAGSHIP")
        ? (planRaw as PlanName)
        : "FREE";

    const { cycleStart, cycleEnd } = getCurrentCycleWindow(
      subscription?.startDate ?? null
    );

    const supabaseAdmin = getSupabaseAdmin();
    const [{ data: cycleLogs, error: cycleErr }, { data: weekLogs, error: weekErr }] =
      await Promise.all([
        supabaseAdmin
          .from("usage_logs")
          .select("action, createdAt")
          .eq("userId", userId)
          .gte("createdAt", cycleStart)
          .lt("createdAt", cycleEnd),
        supabaseAdmin
          .from("usage_logs")
          .select("action, createdAt")
          .eq("userId", userId)
          .gte("createdAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

    if (cycleErr) {
      return NextResponse.json(
        { error: `Failed to check usage: ${cycleErr.message}` },
        { status: 500 }
      );
    }
    if (weekErr) {
      return NextResponse.json(
        { error: `Failed to check week usage: ${weekErr.message}` },
        { status: 500 }
      );
    }

    const usedAnalyze =
      (cycleLogs || []).filter((row: any) => getActionGroup(row.action) === "ANALYZE")
        .length || 0;
    const usedGenerate =
      (cycleLogs || []).filter((row: any) => getActionGroup(row.action) === "GENERATE")
        .length || 0;

    const weekAnalyze =
      (weekLogs || []).filter((row: any) => getActionGroup(row.action) === "ANALYZE")
        .length || 0;
    const weekGenerate =
      (weekLogs || []).filter((row: any) => getActionGroup(row.action) === "GENERATE")
        .length || 0;

    const limit = LIMITS[plan] || LIMITS.FREE;

    return NextResponse.json({
      plan,
      usage: {
        analyze: {
          used: usedAnalyze,
          limit: limit.analyze,
          remaining: Math.max(limit.analyze - usedAnalyze, 0),
          cycleStart,
          cycleEnd,
        },
        generate: {
          used: usedGenerate,
          limit: limit.generate,
          remaining: Math.max(limit.generate - usedGenerate, 0),
          cycleStart,
          cycleEnd,
        },
        week: {
          analyze: weekAnalyze,
          generate: weekGenerate,
        },
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
    });
  }
}