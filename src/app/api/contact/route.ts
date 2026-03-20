import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "請填寫姓名").max(100),
  email: z.string().email("請填寫有效的 Email"),
  category: z.enum(["GENERAL", "BUG", "BILLING", "FEATURE", "OTHER"]).default("GENERAL"),
  message: z.string().min(1, "請填寫訊息內容").max(2000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "欄位格式不正確" },
        { status: 400 }
      );
    }

    await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        category: parsed.data.category,
        message: parsed.data.message,
      },
    });

    return NextResponse.json({ ok: true, message: "訊息已送出，我們會盡快回覆！" });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "送出失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
