import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

const PLAN_LABELS: Record<string, string> = {
  CREATOR: "Creator",
  PRO: "專業版",
  FLAGSHIP: "旗艦版",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildEmailHtml(name: string | null, plan: string, endDate: string, daysLeft: number) {
  const planLabel = PLAN_LABELS[plan] || plan;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: 'Noto Sans TC', sans-serif; background: #0a0a0b; color: #e5e5e5; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #141415; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); padding: 32px;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
      <div style="width: 32px; height: 32px; border-radius: 8px; background: #ff3d30; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 14px;">H</div>
      <span style="font-weight: 700; font-size: 18px;">Hookvox</span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 800;">
      你的訂閱即將到期
    </h2>

    <p style="color: #999; font-size: 14px; line-height: 1.8; margin: 0 0 20px;">
      Hi ${name || "創作者"}，提醒你：
    </p>

    <div style="background: rgba(255,61,48,0.08); border: 1px solid rgba(255,61,48,0.2); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; color: #ccc;">
        你的 <strong style="color: #ff3d30;">${planLabel}</strong> 方案將於
        <strong>${formatDate(endDate)}</strong> 到期（約剩 <strong>${daysLeft}</strong> 天）。
      </p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #888;">
        到期後會自動回到免費方案，額度將重置為 3 次分析 + 3 次生成。
      </p>
    </div>

    <p style="color: #999; font-size: 14px; line-height: 1.8; margin: 0 0 24px;">
      如要繼續使用付費功能，請在到期前至方案頁重新訂閱。
    </p>

    <a href="https://hookvox-1yib.vercel.app/plans"
       style="display: inline-block; background: #ff3d30; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">
      前往續訂 →
    </a>

    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 32px 0 16px;" />

    <p style="color: #555; font-size: 12px; margin: 0;">
      此信件由 Hookvox 系統自動寄出，如有疑問請回信或聯繫 ksjw200121@gmail.com
    </p>
  </div>
</body>
</html>`.trim();
}

/**
 * GET /api/cron/expiry-reminder
 *
 * 每天由 Vercel Cron 觸發，掃描 3 天內到期的訂閱並寄送提醒信。
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY 未設定" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: expiringSubs, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, userId, plan, status, endDate")
    .eq("status", "ACTIVE")
    .neq("plan", "FREE")
    .gte("endDate", now.toISOString())
    .lte("endDate", threeDaysLater.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiringSubs || expiringSubs.length === 0) {
    return NextResponse.json({ reminded: 0, message: "沒有即將到期的訂閱" });
  }

  const userIds = expiringSubs.map((s) => s.userId);
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, name, supabaseId")
    .in("id", userIds);

  const userMap = new Map((users || []).map((u) => [u.id, u]));

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const sub of expiringSubs) {
    const user = userMap.get(sub.userId);
    if (!user?.email) continue;

    const daysLeft = Math.ceil(
      (new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const planLabel = PLAN_LABELS[sub.plan] || sub.plan;

    try {
      await resend.emails.send({
        from: "Hookvox <onboarding@resend.dev>",
        to: user.email,
        subject: `提醒：你的 Hookvox ${planLabel}方案將在 ${daysLeft} 天後到期`,
        html: buildEmailHtml(user.name, sub.plan, sub.endDate, daysLeft),
      });
      results.push({ email: user.email, ok: true });
    } catch (err: any) {
      results.push({ email: user.email, ok: false, error: err?.message });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    reminded: sent,
    failed,
    results,
    message: `寄出 ${sent} 封提醒信${failed > 0 ? `，${failed} 封失敗` : ""}`,
  });
}
