import { NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  getUsageSnapshotForSupabaseId,
} from "@/lib/usage-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const snapshot = await getUsageSnapshotForSupabaseId(userId);

    return NextResponse.json({
      ...snapshot,
      version: "usage-snapshot-v4",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
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
      version: "usage-snapshot-v4",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    });
  }
}