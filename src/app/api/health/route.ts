import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Supabase env check
  checks.supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing";

  // AI provider check
  checks.anthropic = process.env.ANTHROPIC_API_KEY ? "configured" : "missing";

  const allOk = checks.database === "ok";

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
