// src/lib/usage-checker.ts
import { createClient } from "@supabase/supabase-js";

const FREE_MONTHLY_LIMIT = 3;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id; // supabaseId
}

export async function checkUsageLimit(supabaseId: string): Promise<
  | { allowed: true; isPro: boolean; publicUserId: string }
  | { allowed: false; message: string; used: number; limit: number }
> {
  const supabaseAdmin = getSupabaseAdmin();

  // 查本月使用次數（直接用 supabaseId）
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabaseAdmin
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("userId", supabaseId)
    .gte("createdAt", startOfMonth);

  const used = count ?? 0;
  console.log("[checkUsageLimit] supabaseId:", supabaseId, "used:", used);

  if (used >= FREE_MONTHLY_LIMIT) {
    return {
      allowed: false,
      message: "FREE_LIMIT_REACHED",
      used,
      limit: FREE_MONTHLY_LIMIT,
    };
  }

  return { allowed: true, isPro: false, publicUserId: supabaseId };
}

export async function logUsage(userId: string, action: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from("usage_logs").insert({
    id: crypto.randomUUID(),
    userId,
    action,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}