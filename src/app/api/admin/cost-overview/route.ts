import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RuntimeMetricRow = {
  metric_date: string;
  analyze_count: number;
  generate_count: number;
  estimated_cost_usd: number;
  hard_locked: boolean;
};

type UsageLogRow = {
  userId: string;
  action: string;
  createdAt: string;
};

type UserRow = {
  supabaseId: string;
  email: string | null;
  name: string | null;
  role: string | null;
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function normalizeId(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .trim();
}

function startOfDayIso(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatDateOnly(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getLastNDates(count: number) {
  const dates: string[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(formatDateOnly(d));
  }

  return dates;
}

export async function GET(req: Request) {
  try {
    const adminCheck = await assertAdmin(req);

    if (!adminCheck.ok) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const today = formatDateOnly(new Date());
    const todayStartIso = startOfDayIso(new Date());
    const last7Dates = getLastNDates(7);

    const [
      todayMetricResult,
      monthMetricsResult,
      weekMetricsResult,
      todayUsageResult,
      usersResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("system_runtime_metrics")
        .select(
          "metric_date, analyze_count, generate_count, estimated_cost_usd, hard_locked"
        )
        .eq("metric_date", today)
        .maybeSingle(),

      supabaseAdmin
        .from("system_runtime_metrics")
        .select(
          "metric_date, analyze_count, generate_count, estimated_cost_usd, hard_locked"
        )
        .gte(
          "metric_date",
          formatDateOnly(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          )
        )
        .order("metric_date", { ascending: true }),

      supabaseAdmin
        .from("system_runtime_metrics")
        .select(
          "metric_date, analyze_count, generate_count, estimated_cost_usd, hard_locked"
        )
        .in("metric_date", last7Dates)
        .order("metric_date", { ascending: true }),

      supabaseAdmin
        .from("usage_logs")
        .select("userId, action, createdAt")
        .gte("createdAt", todayStartIso),

      supabaseAdmin.from("users").select("supabaseId, email, name, role"),
    ]);

    if (todayMetricResult.error) {
      throw new Error(
        `Failed to load today metrics: ${todayMetricResult.error.message}`
      );
    }
    if (monthMetricsResult.error) {
      throw new Error(
        `Failed to load month metrics: ${monthMetricsResult.error.message}`
      );
    }
    if (weekMetricsResult.error) {
      throw new Error(
        `Failed to load week metrics: ${weekMetricsResult.error.message}`
      );
    }
    if (todayUsageResult.error) {
      throw new Error(
        `Failed to load usage logs: ${todayUsageResult.error.message}`
      );
    }
    if (usersResult.error) {
      throw new Error(`Failed to load users: ${usersResult.error.message}`);
    }

    const todayMetric = (todayMetricResult.data || null) as RuntimeMetricRow | null;
    const monthMetrics = (monthMetricsResult.data || []) as RuntimeMetricRow[];
    const weekMetrics = (weekMetricsResult.data || []) as RuntimeMetricRow[];
    const todayUsage = (todayUsageResult.data || []) as UsageLogRow[];
    const users = (usersResult.data || []) as UserRow[];

    const userMap = new Map(
      users.map((user) => [
        normalizeId(user.supabaseId),
        {
          email: user.email,
          name: user.name,
          role: user.role,
        },
      ])
    );

    const usageByUser = new Map<
      string,
      {
        userId: string;
        analyzeCount: number;
        generateCount: number;
        totalCount: number;
      }
    >();

    for (const row of todayUsage) {
      const normalizedUserId = normalizeId(row.userId);

      const existing = usageByUser.get(normalizedUserId) || {
        userId: normalizedUserId,
        analyzeCount: 0,
        generateCount: 0,
        totalCount: 0,
      };

      if (row.action === "ANALYZE") {
        existing.analyzeCount += 1;
      } else {
        existing.generateCount += 1;
      }

      existing.totalCount += 1;
      usageByUser.set(normalizedUserId, existing);
    }

    const topUsers = Array.from(usageByUser.values())
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 10)
      .map((item) => {
        const profile = userMap.get(item.userId);
        return {
          userId: item.userId,
          email: profile?.email || "",
          name: profile?.name || "",
          role: profile?.role || "USER",
          analyzeCount: item.analyzeCount,
          generateCount: item.generateCount,
          totalCount: item.totalCount,
        };
      });

    const monthSummary = monthMetrics.reduce(
      (acc, row) => {
        acc.analyzeCount += Number(row.analyze_count || 0);
        acc.generateCount += Number(row.generate_count || 0);
        acc.estimatedCostUsd += Number(row.estimated_cost_usd || 0);
        if (row.hard_locked) acc.hardLockedDays += 1;
        return acc;
      },
      {
        analyzeCount: 0,
        generateCount: 0,
        estimatedCostUsd: 0,
        hardLockedDays: 0,
      }
    );

    const weekMap = new Map(weekMetrics.map((row) => [row.metric_date, row]));

    const weekSeries = last7Dates.map((date) => {
      const row = weekMap.get(date);
      return {
        date,
        analyzeCount: Number(row?.analyze_count || 0),
        generateCount: Number(row?.generate_count || 0),
        estimatedCostUsd: Number(row?.estimated_cost_usd || 0),
        hardLocked: Boolean(row?.hard_locked || false),
      };
    });

    return NextResponse.json({
      today: {
        date: today,
        analyzeCount: Number(todayMetric?.analyze_count || 0),
        generateCount: Number(todayMetric?.generate_count || 0),
        estimatedCostUsd: Number(todayMetric?.estimated_cost_usd || 0),
        hardLocked: Boolean(todayMetric?.hard_locked || false),
      },
      month: monthSummary,
      weekSeries,
      topUsers,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("admin cost overview error:", err);

    return NextResponse.json(
      { error: "讀取管理數據失敗" },
      { status: 500 }
    );
  }
}