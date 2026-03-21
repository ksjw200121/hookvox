import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 優惠碼只在伺服器端驗證，前端不再暴露
const VALID_COUPONS: Record<string, { discount: number; label: string }> = {
  JS2026: { discount: 0.1, label: "早鳥優惠 -10%" },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body?.code || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "請輸入優惠碼" }, { status: 400 });
    }

    const coupon = VALID_COUPONS[code];
    if (!coupon) {
      return NextResponse.json({ valid: false, error: "無效的優惠碼" });
    }

    return NextResponse.json({
      valid: true,
      code,
      discount: coupon.discount,
      label: coupon.label,
    });
  } catch {
    return NextResponse.json({ error: "驗證失敗" }, { status: 500 });
  }
}
