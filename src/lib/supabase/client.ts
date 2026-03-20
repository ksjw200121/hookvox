// 重要：不再每次建立新 Supabase instance。
// 之前每個頁面呼叫 createClient() 都會產生一個獨立的 Supabase client，
// 導致多個 client 同時搶 localStorage 的 auth token，互相覆蓋造成登出。
// 現在統一回傳 singleton，所有頁面共用同一個 auth 狀態。

import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createClient(): SupabaseClient {
  return supabase;
}
