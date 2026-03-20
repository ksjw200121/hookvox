import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const adminCheck = await assertAdmin(req);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all"; // all | unread
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;

  const where = filter === "unread" ? { isRead: false } : {};

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return NextResponse.json({
    messages,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function PATCH(req: Request) {
  const adminCheck = await assertAdmin(req);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = await req.json();
  const { id, isRead } = body;

  if (!id || typeof isRead !== "boolean") {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  await prisma.contactMessage.update({
    where: { id },
    data: { isRead },
  });

  return NextResponse.json({ ok: true });
}
