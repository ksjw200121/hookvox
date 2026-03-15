import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserIdFromRequest,
  getUserPlan,
  type PlanName,
} from "@/lib/usage-checker";

export const runtime = "nodejs";

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
      return NextResponse.json({ error: "未登入" }, { status: 401 });
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
    const err = error as Error;
    console.error("viral-database route error:", err);

    return NextResponse.json(
      { error: err?.message || "讀取爆款資料庫失敗" },
      { status: 500 }
    );
  }
}