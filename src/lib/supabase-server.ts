import { createClient } from "@supabase/supabase-js"

// 用 service role key，繞過 RLS，只在後端使用
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const FREE_MONTHLY_LIMIT = 3

/**
 * 從 Request headers 取得目前登入的 userId
 * 前端需要在 headers 帶上 Authorization: Bearer <access_token>
 */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.replace("Bearer ", "")
  const supabase = createServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

/**
 * 檢查用戶本月使用次數
 * 回傳：{ allowed: boolean, used: number, limit: number | null }
 */
export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean
  used: number
  limit: number | null
  isPro: boolean
}> {
  const supabase = createServerSupabase()

  // 查訂閱狀態
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("userId", userId)
    .eq("status", "ACTIVE")
    .maybeSingle()

  const isPro = subscription?.plan === "PRO" || subscription?.plan === "CREATOR"

  // Pro 用戶無限制
  if (isPro) return { allowed: true, used: 0, limit: null, isPro: true }

  // 查本月使用次數
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .gte("createdAt", startOfMonth.toISOString())

  const used = count ?? 0
  return {
    allowed: used < FREE_MONTHLY_LIMIT,
    used,
    limit: FREE_MONTHLY_LIMIT,
    isPro: false,
  }
}

/**
 * 寫入使用紀錄
 */
export async function logUsage(userId: string, action: string) {
  const supabase = createServerSupabase()
  await supabase.from("usage_logs").insert({
    userId,
    action,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  })
}