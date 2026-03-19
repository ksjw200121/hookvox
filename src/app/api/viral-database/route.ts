import { NextResponse } from "next/server";
import { sanitizeApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  getUserIdFromRequest,
  getUserPlan,
  type PlanName,
} from "@/lib/usage-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAngleScriptLimit(plan: PlanName) {
  if (plan === "PRO" || plan === "FLAGSHIP") return 3;
  if (plan === "CREATOR") return 1;
  return 0;
}

function buildSearchableText(item: any) {
  const analysis = item?.analysis || {};
  const generated = analysis?.generated || {};
  const nextAngles = Array.isArray(analysis?.nextAngles) ? analysis.nextAngles : [];

  const parts = [
    item?.videoUrl || "",
    item?.transcript || "",
    analysis?.coreTopic || "",
    analysis?.hook || "",
    analysis?.summary || "",
    analysis?.hookModel || "",
    analysis?.targetAudience || "",
    analysis?.emotion || "",
    analysis?.ctaType || "",
    analysis?.combinedFormula || "",
    ...(analysis?.viralReasons || []),
    ...(analysis?.painPoints || []),
    ...(analysis?.keyInsights || []),
    ...(analysis?.legalIssues || []),
    ...(generated?.titles || []),
    ...((generated?.scripts || []).flatMap((script: any) => [
      script?.hook || "",
      script?.fullScript || "",
      script?.cta || "",
    ])),
    ...nextAngles.flatMap((angle: any) => [
      angle?.angle || "",
      angle?.hook || "",
      angle?.whyThisWorks || "",
      angle?.generatedScript?.hook || "",
      angle?.generatedScript?.fullScript || "",
      angle?.generatedScript?.cta || "",
    ]),
  ];

  return parts.join(" ").toLowerCase();
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ error: "登入狀態已過期，請重新登入後再試" }, { status: 401 });
    }

    const plan = await getUserPlan(userId);
    const angleScriptLimitPerVideo = getAngleScriptLimit(plan);

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim().toLowerCase();

    const items = await prisma.viralDatabase.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    const filteredItems = q
      ? items.filter((item) => buildSearchableText(item).includes(q))
      : items;

    return NextResponse.json({
      items: filteredItems,
      meta: {
        plan,
        angleScriptLimitPerVideo,
      },
    });
  } catch (error: unknown) {
    console.error("viral-database route error:", error);
    const sanitized = sanitizeApiError(error, "讀取爆款資料庫失敗，請稍後再試");
    return NextResponse.json(
      { error: sanitized.message },
      { status: sanitized.status }
    );
  }
}