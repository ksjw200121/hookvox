import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase: 缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，請在 .env.local 設定");
    return createSupabaseClient(
      "https://placeholder.supabase.co",
      "placeholder"
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}